import mysql.connector
import json

# Database connection configuration
db_config = {
    'user': 'root',
    'password': 'Bruno@1980',
    'host': 'localhost',
    'database': 'demo'
}

def fetch_locations():
    try:
        # Establish the database connection
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Query to fetch data from the locations table
        query = "SELECT villageId AS id, villageName AS name, cellId AS parentLocationId FROM villages;"
        cursor.execute(query)

        # Fetch all rows from the executed query
        rows = cursor.fetchall()

        # Close the cursor and connection
        cursor.close()
        connection.close()

        return rows

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return []

def generate_json(locations):
    # Create a dictionary to hold locations by ID for easy lookup
    location_dict = {}
    
    # Create the base structure for each location
    for location in locations:
        location_dict[location['id']] = {
            "id": location['id'],
            "createdAt": "2024-08-26T00:00:00Z",  # Example static date, replace with dynamic if needed
            "updatedAt": "2024-08-26T00:00:00Z",  # Example static date, replace with dynamic if needed
            "parentLocation": location['parentLocationId'],
            "name": location['name'],
            "locationLevelId": 4
        }

    return list(location_dict.values())

def save_to_json_file(data, filename='location_village.json'):
    with open(filename, 'w') as json_file:
        json.dump(data, json_file, indent=4, default=str)  # Convert datetime objects to strings

if __name__ == "__main__":
    locations = fetch_locations()
    json_data = generate_json(locations)
    save_to_json_file(json_data)
    print(f"JSON file has been created successfully.")
