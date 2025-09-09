import re
import json

def parse_missing_persons_data(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    data = []
    # Regex to find blocks of missing person information
    # This regex looks for a date (e.g., July 29, 2024), followed by status, category, reported missing date, and location.
    # It's designed to be flexible with the exact text and line breaks.
    pattern = re.compile(r'(\w+ \d{1,2}, \d{4})\s*\n\s*(.*?)\s*\n\s*\*\*(Missing (?:Adults|Children|Veterans))\*\*\s*\n\s*(Reported Missing.*?)\s*\n\s*\[(.*?)\]\(\), \[(.*?)\]\(\)(?: - \[(.*?)\]\(\))?')

    matches = pattern.findall(content)

    for match in matches:
        entry = {
            "date": match[0].strip(),
            "status": match[1].strip(),
            "category": match[2].strip(),
            "reportedMissing": match[3].strip(),
            "location": f"{match[4].strip()}, {match[5].strip()}"
        }
        if match[6]: # Check if country exists
            entry["location"] += f", {match[6].strip()}"
        data.append(entry)
    return data

if __name__ == "__main__":
    parsed_data = parse_missing_persons_data("missing_persons_page_content.txt")
    # Filter data to include only US locations
    us_data = [item for item in parsed_data if "USA" in item["location"] or "United States" in item["location"]]
    with open("missing_persons_data.json", "w") as f:
        json.dump(us_data, f, indent=4)
    print(f"Extracted {len(us_data)} missing persons records to missing_persons_data.json")


