import pandas as pd
from datetime import datetime
import numpy as np

def convert_date_columns_to_text(input_file, output_file=None):
    """
    Read Excel file and convert date columns to text format DD/MM/YYYY
    
    Parameters:
    input_file (str): Path to input Excel file
    output_file (str): Path to output Excel file (optional, defaults to input_file with '_converted' suffix)
    """
    
    try:
        # Read the Excel file
        print(f"Reading Excel file: {input_file}")
        df = pd.read_excel(input_file)
        
        # Create a copy to avoid modifying the original
        df_converted = df.copy()
        
        # Find date columns
        date_columns = []
        for col in df.columns:
            # Check if column contains datetime objects
            if df[col].dtype == 'datetime64[ns]' or pd.api.types.is_datetime64_any_dtype(df[col]):
                date_columns.append(col)
            else:
                # Check if column contains date-like strings that can be converted
                sample_data = df[col].dropna().head(10)
                if len(sample_data) > 0:
                    try:
                        # Try to convert a sample to see if it's a date
                        pd.to_datetime(sample_data.iloc[0], errors='raise')
                        date_columns.append(col)
                    except:
                        pass
        
        print(f"Found {len(date_columns)} date columns: {date_columns}")
        
        # Convert each date column to DD/MM/YYYY format
        for col in date_columns:
            print(f"Converting column: {col}")
            
            # Convert to datetime first (in case it's not already)
            df_converted[col] = pd.to_datetime(df_converted[col], errors='coerce')
            
            # Convert to DD/MM/YYYY string format
            df_converted[col] = df_converted[col].dt.strftime('%d/%m/%Y')
            
            # Handle NaT (Not a Time) values - convert to empty string or keep as NaN
            df_converted[col] = df_converted[col].fillna('')
        
        # Set output filename if not provided
        if output_file is None:
            file_parts = input_file.rsplit('.', 1)
            output_file = f"{file_parts[0]}_converted.{file_parts[1]}"
        
        # Save the converted data
        print(f"Saving converted file: {output_file}")
        df_converted.to_excel(output_file, index=False)
        
        print("Conversion completed successfully!")
        print(f"Original file: {input_file}")
        print(f"Converted file: {output_file}")
        
        # Display sample of converted data
        if date_columns:
            print("\nSample of converted date columns:")
            print(df_converted[date_columns].head())
        
        return df_converted
        
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return None

def convert_specific_columns(input_file, column_names, output_file=None):
    """
    Convert specific columns to DD/MM/YYYY format
    
    Parameters:
    input_file (str): Path to input Excel file
    column_names (list): List of column names to convert
    output_file (str): Path to output Excel file (optional)
    """
    
    try:
        print(f"Reading Excel file: {input_file}")
        df = pd.read_excel(input_file)
        df_converted = df.copy()
        
        for col in column_names:
            if col in df.columns:
                print(f"Converting column: {col}")
                df_converted[col] = pd.to_datetime(df_converted[col], errors='coerce')
                df_converted[col] = df_converted[col].dt.strftime('%d/%m/%Y')
                df_converted[col] = df_converted[col].fillna('')
            else:
                print(f"Warning: Column '{col}' not found in the Excel file")
        
        if output_file is None:
            file_parts = input_file.rsplit('.', 1)
            output_file = f"{file_parts[0]}_converted.{file_parts[1]}"
        
        df_converted.to_excel(output_file, index=False)
        print(f"File saved as: {output_file}")
        
        return df_converted
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return None

# Example usage
if __name__ == "__main__":
    # Method 1: Automatically detect and convert all date columns
    input_filename = "Company_Employees_Sample NOGUCHI NEW UPLOAD 03-06-2025.xlsx"  # Replace with your Excel file path
    convert_date_columns_to_text(input_filename)
    
    # Method 2: Convert specific columns only
    # specific_columns = ["Date_Column1", "Date_Column2"]  # Replace with your column names
    # convert_specific_columns(input_filename, specific_columns)