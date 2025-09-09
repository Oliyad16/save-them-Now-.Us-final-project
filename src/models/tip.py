from .user import db

class Tip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('missing_person.id'))
    name = db.Column(db.String(100))
    email = db.Column(db.String(100))
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())