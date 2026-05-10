import os
import pandas as pd
import numpy as np


def calculate_indicators(df):
    """
    计算股票的技术指标：均线和均线斜率
    """
    df = df.sort_values('date').reset_index(drop=True)

    # 1. 计算均线
    df['MA5'] = df['close'].rolling(window=5).mean()
    df['MA10'] = df['close'].rolling(window=10).mean()
    df['MA20'] = df['close'].rolling(window=20).mean()
    df['MA120'] = df['close'].rolling(window=120).mean()

    # 2. 计算均线斜率 (动态窗口优化)
    # 针对不同周期的均线，使用不同长度的回溯窗口来计算斜率
    # 公式: (当前均线 - N天前均线) / N天前均线 * 100

    # MA5 变化快，看近 2 天的趋势
    df['MA5_slope'] = (df['MA5'] - df['MA5'].shift(2)) / df['MA5'].shift(2) * 100

    # MA10 看近 3 天的趋势
    df['MA10_slope'] = (df['MA10'] - df['MA10'].shift(3)) / df['MA10'].shift(3) * 100

    # MA20 是中期生命线，看近 5 天(一周)的趋势，过滤短期噪音
    df['MA20_slope'] = (df['MA20'] - df['MA20'].shift(5)) / df['MA20'].shift(5) * 100

    # MA120 是牛熊分界线，变化极慢，看近 20 天(一个月)的趋势
    df['MA120_slope'] = (df['MA120'] - df['MA120'].shift(20)) / df['MA120'].shift(20) * 100

    # 3. 计算成交量变化 (今天成交量 / 昨天成交量)
    df['vol_ratio'] = df['volume'] / df['volume'].shift(1)

    return df


def analyze_single_stock(csv_path):
    try:
        df = pd.read_csv(csv_path)
        if df.empty or len(df) < 120:
            return None

        df = calculate_indicators(df)
        return df.iloc[-1]  # 返回最后一天的数据
    except Exception as e:
        return None


def scan_all_stocks(csv_dir):
    print("开始扫描股票...")
    results = []

    for filename in os.listdir(csv_dir):
        if filename.endswith('.csv'):
            code = filename.split('.')[0]
            csv_path = os.path.join(csv_dir, filename)

            latest = analyze_single_stock(csv_path)
            if latest is None:
                continue

            # ==========================================
            # 策略逻辑：寻找 MA20 走平，且放量突破的股票
            # ==========================================

            # 1. 判断 MA20 走平：斜率的绝对值非常小 (例如在 -0.2% 到 0.2% 之间)
            # 这意味着过去 5 天，MA20 几乎是一条水平线
            cond_ma20_flat = abs(latest['MA20_slope']) < 0.2

            # 2. 判断 MA120 趋势：长期趋势不能是向下的 (斜率 > -0.5%)
            cond_ma120_safe = latest['MA120_slope'] > -0.5

            # 3. 价格突破：今天收盘价站上 MA20
            cond_price_breakout = latest['close'] > latest['MA20']

            # 4. 成交量配合：今天成交量至少是昨天的 1.5 倍
            cond_volume_up = latest['vol_ratio'] > 1.5

            # 综合条件
            if cond_ma20_flat and cond_ma120_safe and cond_price_breakout and cond_volume_up:
                results.append({
                    'code': code,
                    'date': latest['date'],
                    'close': latest['close'],
                    'MA20': round(latest['MA20'], 2),
                    'MA20_slope(%)': round(latest['MA20_slope'], 2),
                    'MA120_slope(%)': round(latest['MA120_slope'], 2),
                    'vol_ratio': round(latest['vol_ratio'], 2)
                })

    print(f"\n扫描完成！共找到 {len(results)} 只符合条件的股票：")
    result_df = pd.DataFrame(results)
    if not result_df.empty:
        print(result_df.to_string(index=False))
    else:
        print("没有找到符合条件的股票。")


if __name__ == "__main__":
    csv_directory = 'csvData'
    if not os.path.exists(csv_directory):
        print(f"错误: 目录 {csv_directory} 不存在。")
    else:
        scan_all_stocks(csv_directory)