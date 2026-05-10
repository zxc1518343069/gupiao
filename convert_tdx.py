import os
import struct
import csv

def convert_tdx_day_to_csv(data_dir, output_dir):
    # 定义通达信 .day 文件的记录格式：
    # 4字节日期(int), 4字节开盘(int), 4字节最高(int), 4字节最低(int), 
    # 4字节收盘(int), 4字节成交额(float), 4字节成交量(int), 4字节保留(int)
    record_format = 'iiiiifii'
    record_size = struct.calcsize(record_format)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    headers = ['date', 'open', 'high', 'low', 'close', 'amount', 'volume']

    # 遍历 data 目录下的所有 .day 文件
    for filename in os.listdir(data_dir):
        if filename.endswith('.day'):
            code = filename.split('.')[0]
            file_path = os.path.join(data_dir, filename)
            output_file = os.path.join(output_dir, f"{code}.csv")
            
            with open(file_path, 'rb') as f, open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(headers)
                
                while True:
                    data = f.read(record_size)
                    if len(data) < record_size:
                        break
                    
                    # 解析二进制数据
                    raw_data = struct.unpack(record_format, data)
                    
                    date = raw_data[0]
                    open_price = raw_data[1] / 100.0
                    high_price = raw_data[2] / 100.0
                    low_price = raw_data[3] / 100.0
                    close_price = raw_data[4] / 100.0
                    amount = raw_data[5]
                    volume = raw_data[6]
                    
                    writer.writerow([date, open_price, high_price, low_price, close_price, amount, volume])
            
            print(f"已转换: {filename} -> {code}.csv")

    print(f"所有文件转换完成，结果已保存至: {output_dir}")

if __name__ == "__main__":
    data_directory = 'data'
    output_directory = 'csvData'
    
    if not os.path.exists(data_directory):
        print(f"错误: 目录 {data_directory} 不存在。")
    else:
        convert_tdx_day_to_csv(data_directory, output_directory)
