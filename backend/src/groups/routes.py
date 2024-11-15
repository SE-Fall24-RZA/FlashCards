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

@group_bp.route('/group/<id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def getGroup(id):
    '''This method fetches a specific group by its ID.'''
    try:
        group = db.child("group").child(id).get()
        return jsonify(
            group=group.val(),
            message='Fetched group successfully',
            status=200
        ), 200
    except Exception as e:
        return jsonify(
            group={},
            message=f"An error occurred: {e}",
            status=400
        ), 400
    
@group_bp.route('/group/all', methods=['GET'])
@cross_origin(supports_credentials=True)
def getdecks():
    '''Fetch all groups that a given user is a member of.'''
    args = request.args
    localId = args.get('localId')
    
    try:
        groups = []
        if localId:
            allGroups = db.child("group").get()
            for grp in allGroups.each():
                obj = grp.val()
                if localId in obj['members']:
                    obj['id'] = grp.key()
                    groups.append(obj)
        else:
            raise Exception("A valid user ID must be provided.")

        return jsonify(groups=groups, message='Fetching groups successfully', status=200), 200
    except Exception as e:
        return jsonify(decks=[], message=f"An error occurred {e}", status=400), 400

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