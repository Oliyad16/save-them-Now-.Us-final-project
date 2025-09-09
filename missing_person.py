from src.models.user import db

class MissingPerson(db.Model):
    __tablename__ = 'missing_persons'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    reported_missing = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # New detailed profile fields
    name = db.Column(db.String(200), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(50), nullable=True)
    ethnicity = db.Column(db.String(100), nullable=True)
    height = db.Column(db.String(50), nullable=True)
    weight = db.Column(db.String(50), nullable=True)
    hair_color = db.Column(db.String(50), nullable=True)
    eye_color = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    circumstances = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(200), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'status': self.status,
            'category': self.category,
            'reportedMissing': self.reported_missing,
            'location': self.location,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'name': self.name,
            'age': self.age,
            'gender': self.gender,
            'ethnicity': self.ethnicity,
            'height': self.height,
            'weight': self.weight,
            'hair_color': self.hair_color,
            'eye_color': self.eye_color,
            'description': self.description,
            'circumstances': self.circumstances,
            'photo': self.photo
        }
