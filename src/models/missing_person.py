from .user import db

class MissingPerson(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    case_number = db.Column(db.String(20))
    dlc = db.Column(db.String(20))
    legal_last_name = db.Column(db.String(100))
    legal_first_name = db.Column(db.String(100))
    missing_age = db.Column(db.String(20))
    city = db.Column(db.String(100))
    county = db.Column(db.String(100))
    state = db.Column(db.String(10))
    biological_sex = db.Column(db.String(20))
    race_ethnicity = db.Column(db.String(50))
    date_modified = db.Column(db.String(20))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # Legacy fields for compatibility
    name = db.Column(db.String(100))
    date = db.Column(db.String(50))
    status = db.Column(db.String(100))
    category = db.Column(db.String(50))
    reported_missing = db.Column(db.String(100))
    location = db.Column(db.String(200))
    description = db.Column(db.Text)