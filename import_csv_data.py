import csv
import sys
import os
import time
import json
from typing import Dict, Tuple, Optional

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# Ensure project root on path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from src.models.user import db
from src.models.missing_person import MissingPerson

GEOCACHE_PATH = os.path.join(os.path.dirname(__file__), 'geocache.json')


def load_cache() -> Dict[str, Dict[str, float]]:
    if os.path.exists(GEOCACHE_PATH):
        try:
            with open(GEOCACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_cache(cache: Dict[str, Dict[str, float]]):
    try:
        with open(GEOCACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def geocode_city_state(geolocator: Nominatim, city: str, state: str) -> Optional[Tuple[float, float]]:
    try:
        location = geolocator.geocode(f"{city}, {state}, USA")
        if location:
            return location.latitude, location.longitude
    except Exception:
        return None
    return None


def get_category(age_str: str) -> str:
    try:
        age = int(age_str.split()[0])
        return "Missing Children" if age < 18 else "Missing Adults"
    except Exception:
        return "Missing Adults"


def import_csv_data(limit: Optional[int] = None, batch_size: int = 500):
    with app.app_context():
        print("Clearing existing missing persons...")
        MissingPerson.query.delete()
        db.session.commit()

        cache = load_cache()
        geolocator = Nominatim(user_agent="missing_persons_app")
        geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)

        count = 0
        committed = 0

        with open('missing-persons.csv', 'r', encoding='utf-8') as file:
            content = file.read()
            if content.startswith('\ufeff'):
                content = content[1:]

            reader = csv.DictReader(content.splitlines())

            for row in reader:
                count += 1
                if limit and count > limit:
                    break

                city = (row.get('City') or '').strip()
                state = (row.get('State') or '').strip()
                cache_key = f"{city},{state}".lower()

                lat = None
                lng = None
                if city and state:
                    if cache_key in cache:
                        lat = cache[cache_key]['lat']
                        lng = cache[cache_key]['lon']
                    else:
                        coords = geocode_city_state(geolocator, city, state)
                        if coords:
                            lat, lng = coords
                            cache[cache_key] = {"lat": lat, "lon": lng}

                category = get_category(row.get('Missing Age') or '')
                full_name = f"{(row.get('Legal First Name') or '').strip()} {(row.get('Legal Last Name') or '').strip()}".strip()
                location_str = ", ".join([p for p in [city, (row.get('County') or '').strip(), state, 'USA'] if p])

                person = MissingPerson(
                    case_number=(row.get('Case Number') or '').strip().strip('"'),
                    dlc=(row.get('DLC') or '').strip(),
                    legal_last_name=(row.get('Legal Last Name') or '').strip(),
                    legal_first_name=(row.get('Legal First Name') or '').strip(),
                    missing_age=(row.get('Missing Age') or '').strip(),
                    city=city,
                    county=(row.get('County') or '').strip(),
                    state=state,
                    biological_sex=(row.get('Biological Sex') or '').strip(),
                    race_ethnicity=(row.get('Race / Ethnicity') or '').strip(),
                    date_modified=(row.get('Date Modified') or '').strip(),
                    latitude=lat,
                    longitude=lng,
                    # Legacy frontend fields
                    name=full_name,
                    date=(row.get('Date Modified') or '').strip(),
                    status='Active',
                    category=category,
                    reported_missing=f"Reported Missing {(row.get('DLC') or '').strip()}",
                    location=location_str,
                    description=f"Case #{(row.get('Case Number') or '').strip()} - {(row.get('Missing Age') or '').strip()} {(row.get('Biological Sex') or '').strip()} from {city}, {state}"
                )

                db.session.add(person)

                if count % batch_size == 0:
                    db.session.commit()
                    committed += batch_size
                    print(f"Imported {committed} records...")
                    save_cache(cache)

        db.session.commit()
        save_cache(cache)
        print(f"Successfully imported {count} records from CSV")


if __name__ == '__main__':
    # Adjust the limit if you want to test with fewer rows
    import_csv_data(limit=None)