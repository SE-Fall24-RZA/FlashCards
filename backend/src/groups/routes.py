'''groups.py is a file in group folder that has all the functions defined that manipulate groups. All CRUD functions are defined here.'''
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from datetime import datetime

try:
    from .. import firebase
except ImportError:
    from __init__ import firebase


group_bp = Blueprint('group_bp', __name__)
db = firebase.database()

@group_bp.route('/group/create', methods=['POST'])
@cross_origin(supports_credentials=True)
def create():
    '''Create a new group.'''
    try:
        data = request.get_json()
        localId = data['localId']
        group_name = data['group_name']
        description = data['description']
        
        db.child("group").push({
            "group_name": group_name,
            "members": [localId],
            "description": description
        })

        return jsonify(message='Create Group Successful', status=201), 201
    except Exception as e:
        return jsonify(message=f'Create Group Failed {e}', status=400), 400