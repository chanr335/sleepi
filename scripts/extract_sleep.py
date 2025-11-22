import xml.etree.ElementTree as ET
import csv
import os

# path to your Health export
XML_PATH = "export.xml"          # change if it's not in the same folder
CSV_PATH = "sleep_data.csv"

def main():
    # Open CSV for writing
    with open(CSV_PATH, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        # header row
        writer.writerow(["startDate", "endDate", "value", "sourceName", "device"])

        # iterparse will stream the file instead of loading all at once
        context = ET.iterparse(XML_PATH, events=("start", "end"))

        # Skip root until we find it (needed by iterparse)
        _, root = next(context)

        count = 0
        for event, elem in context:
            # We only care when a <Record> element ends
            if event == "end" and elem.tag == "Record":
                record_type = elem.attrib.get("type", "")

                if record_type == "HKCategoryTypeIdentifierSleepAnalysis":
                    start = elem.attrib.get("startDate", "")
                    end = elem.attrib.get("endDate", "")
                    value = elem.attrib.get("value", "")
                    source = elem.attrib.get("sourceName", "")
                    device = elem.attrib.get("device", "")

                    writer.writerow([start, end, value, source, device])
                    count += 1

                # free memory for processed element
                root.clear()

        print(f"Done! Wrote {count} sleep records to {CSV_PATH}")

if __name__ == "__main__":
    main()
