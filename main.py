import os
import pandas as pd
from convert_tdx import convert_tdx_day_to_csv
from services.stock_metadata import get_stock_name

def is_normal_stock(code):
    """
    判断是否为普通A股股票（排除指数、基金、债券等）
    深市主板/中小板: 000, 001, 002, 003
    深市创业板: 300, 301
    沪市主板: 600, 601, 603, 605
    沪市科创板: 688
    北交所: 83, 87, 43, 92 (通达信通常以 bj 开头，这里主要处理 sz/sh)
    """
    if not code.startswith(('sz', 'sh')):
        return False
    
    prefix = code[2:5]
    valid_prefixes = ['000', '001', '002', '003', '300', '301', '600', '601', '603', '605', '688']
    
    if prefix in valid_prefixes:
        return True
    return False

def calculate_indicators(df):
    """
    计算技术指标：均线、斜率、乖离率以及前五天平均成交量
    """
    df = df.sort_values('date').reset_index(drop=True)

    # 1. 计算均线
    df['MA20'] = df['close'].rolling(window=20).mean()
    df['MA60'] = df['close'].rolling(window=60).mean()
    df['MA120'] = df['close'].rolling(window=120).mean()

    # 2. 计算均线斜率
    # MA20 看近5天变化率
    df['MA20_slope'] = (df['MA20'] - df['MA20'].shift(5)) / df['MA20'].shift(5) * 100
    # MA60 看近10天变化率
    df['MA60_slope'] = (df['MA60'] - df['MA60'].shift(10)) / df['MA60'].shift(10) * 100
    # MA120 看近20天变化率
    df['MA120_slope'] = (df['MA120'] - df['MA120'].shift(20)) / df['MA120'].shift(20) * 100

    # 3. 计算收盘价与均线的乖离率 (距离百分比)
    # 正数表示收盘价在均线上方，负数表示在下方
    df['dist_MA20'] = (df['close'] - df['MA20']) / df['MA20'] * 100
    df['dist_MA60'] = (df['close'] - df['MA60']) / df['MA60'] * 100
    df['dist_MA120'] = (df['close'] - df['MA120']) / df['MA120'] * 100

    # 4. 计算前五天的平均成交量
    df['vol_ma5_prev'] = df['volume'].shift(1).rolling(window=5).mean()
    
    # 5. 计算今天成交量与前五天平均成交量的比值
    df['vol_ratio_5d'] = df['volume'] / df['vol_ma5_prev']

    return df

def analyze_single_stock(csv_path):
    try:
        df = pd.read_csv(csv_path)
        if df.empty or len(df) < 25:
            return None
            
        df = calculate_indicators(df)
        return df.iloc[-1]
    except Exception as e:
        return None

def save_results(results, category_name, latest_date, output_dir):
    """
    保存特定类别的结果到文件
    """
    if not results:
        return

    # 按量比从大到小排序
    results.sort(key=lambda x: x['量比(前5日)'], reverse=True)
    result_df = pd.DataFrame(results)
    
    print(f"\n[{category_name}] 扫描完成！共找到 {len(results)} 只符合条件的标的：")
    print(result_df.head(10).to_string(index=False)) # 控制台只打印前10条预览
    if len(results) > 10:
        print(f"... (更多结果请查看导出的文件)")
    
    # 1. 保存为 CSV
    csv_filename = os.path.join(output_dir, f"scan_{category_name}_{latest_date}.csv")
    result_df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
    
    # 2. 保存为 Markdown
    md_filename = os.path.join(output_dir, f"scan_{category_name}_{latest_date}.md")
    with open(md_filename, 'w', encoding='utf-8') as f:
        f.write(f"# {category_name} 扫描结果 ({latest_date})\n\n")
        f.write(f"**扫描条件**：当日成交量大于前五天平均值 1.2 倍\n\n")
        headers = result_df.columns.tolist()
        f.write("| " + " | ".join(headers) + " |\n")
        f.write("|" + "|".join(["---"] * len(headers)) + "|\n")
        for _, row in result_df.iterrows():
            # 将换行符替换为 <br> 以在 Markdown 表格中正确显示多行
            row_strs = [str(x).replace('\n', '<br>') for x in row]
            f.write("| " + " | ".join(row_strs) + " |\n")
            
    print(f"-> 已导出: {csv_filename}")
    print(f"-> 已导出: {md_filename}")

def run_analysis(csv_dir):
    print("\n开始执行策略扫描...")
    
    all_latest_data = []
    
    # 第一遍：读取所有股票的最后一天数据
    for filename in os.listdir(csv_dir):
        if filename.endswith('.csv'):
            code = filename.split('.')[0]
            csv_path = os.path.join(csv_dir, filename)
            
            latest = analyze_single_stock(csv_path)
            if latest is not None and not pd.isna(latest['vol_ratio_5d']):
                latest_dict = latest.to_dict()
                latest_dict['code'] = code
                all_latest_data.append(latest_dict)
                
    if not all_latest_data:
        print("\n扫描完成！没有找到任何有效数据。")
        return

    # 找到全局最新交易日
    global_latest_date = max([int(item['date']) for item in all_latest_data])
    print(f"全局最新交易日为: {global_latest_date}，开始筛选该日数据...")

    stock_results = []
    other_results = [] # 用于存放指数、基金、转债等
    
    for latest in all_latest_data:
        # 只处理最新交易日的数据
        if int(latest['date']) != global_latest_date:
            continue
            
        code = latest['code']
        vol_ratio = latest['vol_ratio_5d']
        ma20_slope = latest['MA20_slope']
        
        if vol_ratio >= 1.2:
            if vol_ratio >= 1.5:
                vol_tag = "⭐⭐ [爆量 >=1.5倍]"
            else:
                vol_tag = "⭐ [放量 1.2-1.5倍]"
                
            def get_ma_status(slope, name):
                if pd.isna(slope):
                    return f"N/A({name})"
                if abs(slope) <= 0.2:
                    return f"🎯 走平({name})"
                elif slope > 0.2:
                    return f"🚀 向上({name})"
                else:
                    return f"📉 向下({name})"

            ma20_tag = get_ma_status(ma20_slope, "MA20")
            ma60_tag = get_ma_status(latest['MA60_slope'], "MA60")
            ma120_tag = get_ma_status(latest['MA120_slope'], "MA120")

            stock_name = get_stock_name(code)
            
            # 过滤 ST 股票 (仅对 A 股进行过滤)
            if is_normal_stock(code) and 'ST' in stock_name.upper():
                continue

            dist_20 = round(latest['dist_MA20'], 2) if pd.notna(latest['dist_MA20']) else 'N/A'
            dist_60 = round(latest['dist_MA60'], 2) if pd.notna(latest['dist_MA60']) else 'N/A'
            dist_120 = round(latest['dist_MA120'], 2) if pd.notna(latest['dist_MA120']) else 'N/A'
            
            slope_20 = round(ma20_slope, 2) if pd.notna(ma20_slope) else 'N/A'
            slope_60 = round(latest['MA60_slope'], 2) if pd.notna(latest['MA60_slope']) else 'N/A'
            slope_120 = round(latest['MA120_slope'], 2) if pd.notna(latest['MA120_slope']) else 'N/A'

            item = {
                '代码': code,
                '名称': stock_name,
                '日期': int(latest['date']),
                '收盘价': round(latest['close'], 2),
                '量比(前5日)': round(vol_ratio, 2),
                '乖离率(%)': f"{dist_20}(MA20)\n{dist_60}(MA60)\n{dist_120}(MA120)",
                '均线斜率(%)': f"{slope_20}(MA20)\n{slope_60}(MA60)\n{slope_120}(MA120)",
                '成交量状态': vol_tag,
                '均线状态': f"{ma20_tag}\n{ma60_tag}\n{ma120_tag}"
            }
            
            # 分类存放
            if is_normal_stock(code):
                stock_results.append(item)
            else:
                other_results.append(item)

    output_dir = 'results'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    if not stock_results and not other_results:
        print(f"\n扫描完成！在 {global_latest_date} 没有找到符合条件的标的。")
    else:
        # 分别保存两类结果
        save_results(stock_results, "A股股票", str(global_latest_date), output_dir)
        save_results(other_results, "指数与基金", str(global_latest_date), output_dir)

if __name__ == "__main__":
    data_directory = 'data'
    csv_directory = 'csvData'
    
    print("=== 第一步：解析通达信数据 ===")
    if not os.path.exists(data_directory):
        print(f"错误: 原始数据目录 {data_directory} 不存在。")
    else:
        convert_tdx_day_to_csv(data_directory, csv_directory)
        
        print("\n=== 第二步：执行量化分析 ===")
        run_analysis(csv_directory)
