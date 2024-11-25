'''groups.py is a file in group folder that has all the functions defined that manipulate groups. All CRUD functions are defined here.'''
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from datetime import datetime
import random
import string

try:
    from .. import firebase
except ImportError:
    from __init__ import firebase


group_bp = Blueprint('group_bp', __name__)
db = firebase.database()
auth = firebase.auth()

@group_bp.route('/group/<id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def getGroup(id):
    '''This method fetches a specific group by its ID.'''
    try:
        group = db.child("group").child(id).get()
        if group.val() != None:
            return jsonify(
                group=group.val(),
                message='Fetched group successfully',
                status=200
            ), 200
        else:
            return jsonify(
                group=None,
                message='Group not found',
                status=404
            ), 404
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
                for usr in obj['members']:
                    if localId == usr["userId"] :
                        obj['id'] = grp.key()
                        groups.append(obj)
        else:
            raise Exception("A valid user ID must be provided.")

        return jsonify(groups=groups, message='Fetching groups successfully', status=200), 200
    except Exception as e:
        return jsonify(groups=[], message=f"An error occurred {e}", status=400), 400

@group_bp.route('/group/create', methods=['POST'])
@cross_origin(supports_credentials=True)
def create():
    '''Create a new group.'''
    try:
        data = request.get_json()
        group_name = data['group_name']
        description = data['description']
        member = {"userId": data['localId'], "email": data['email']}
        owner = data['localId']
        key = ''.join(random.choices(string.ascii_letters, k=6))
        
        db.child("group").push({
            "group_name": group_name,
            "members": [member],
            "description": description,
            "join_key": key,
            "owner": owner
        })

        return jsonify(message='Create Group Successful', status=201), 201
    except Exception as e:
        return jsonify(message=f'Create Group Failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/addMember', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def addMemberToGroup(id):
    '''This adds a given user to the specified group'''
    try:
        data = request.get_json()
        localId = data['localId']
        email = data['email']
        key = data['key']
        group = db.child("group").child(id).get().val()
        if key == group["join_key"]:
            member_list = group["members"]
            if {"userId": localId, "email": email} not in member_list:
                member_list.append({"userId": localId, "email": email})
                db.child("group").child(id).child("members").set(member_list)
                return jsonify(message='User added successfully', status=200), 200
            else:
                raise Exception("User is already in this group")
        else:
            raise Exception("Incorrect join key")
    except Exception as e:
        return jsonify(message=f'User add failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/removeMember', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def removeMemberFromGroup(id):
    '''This removes a given user from the specified group'''
    try:
        data = request.get_json()
        userId = data['userId']
        member_list = db.child("group").child(id).child("members").get().val()
        for i in range(0, len(member_list)):
            if userId == member_list[i]["userId"]:
                member_list.pop(i)
                db.child("group").child(id).child("members").set(member_list)
                return jsonify(message='User removed successfully', status=200), 200
        raise Exception("User is not in this group.")
    except Exception as e:
        return jsonify(message=f'User remove failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/update', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def updateGroup(id):
    '''This updates non-user information for a specified group'''
    try:
        data = request.get_json()
        group_name = data['group_name']
        description = data['description']
        group = db.child("group").child(id).get()
        if group.val() == None:
            raise Exception("Group does not exist")
        db.child("group").child(id).update({
            "group_name": group_name,
            "description": description
        })
        return jsonify(message='Group updated successfully', status=200), 200
    except Exception as e:
        return jsonify(message=f'Group update failed {e}', status=400), 400
    
@group_bp.route('/group/<id>', methods=['DELETE'])
@cross_origin(supports_credentials=True)
def deleteGroup(id):
    '''This method deletes a specific group by its ID.'''
    try:
        group = db.child("group").child(id).get()
        if group.val() == None:
            raise Exception("Group does not exist")
        db.child("group").child(id).remove()
        return jsonify(
            message='Group removed successfully',
            status=200
        ), 200
    except Exception as e:
        return jsonify(
            group={},
            message=f"An error occurred: {e}",
            status=400
        ), 400
    
@group_bp.route('/group/<id>/addDeck', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def addDeckToGroup(id):
    '''This adds a given deck to the specified group'''
    try:
        data = request.get_json()
        group = db.child("group").child(id).get().val()
        if "decks" in group.keys():
            deck_list = group["decks"]
            new_deck = {
                "id": data["id"],
                "title": data["title"],
                "description": data["description"],
                "visibility": data["visibility"],
                "cards_count": data["cards_count"],
                "owner": data["owner"]
            }
            if new_deck not in deck_list:
                deck_list.append(new_deck)
                db.child("group").child(id).child("decks").set(deck_list)
            else:
                raise Exception("Deck already added to this group")
        else:
            db.child("group").child(id).child("decks").set([{
                "id": data["id"],
                "title": data["title"],
                "description": data["description"],
                "visibility": data["visibility"],
                "cards_count": data["cards_count"],
                "owner": data["owner"]
            }])
        return jsonify(message='Deck added successfully', status=200), 200
    except Exception as e:
        return jsonify(message=f'Deck add failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/removeDeck', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def removeDeckFromGroup(id):
    '''This removes a deck from the specified group'''
    try:
        data = request.get_json()
        group = db.child("group").child(id).get().val()
        if "decks" in group.keys():
            deck_list = group["decks"]
            for i in range(0,len(deck_list)):
                if deck_list[i]['id'] == data['id']:
                    deck_list.pop(i)
                    db.child("group").child(id).child("decks").set(deck_list)
                    return jsonify(message='Deck added successfully', status=200), 200
            raise Exception("Deck not assigned to this group")
        else:
            raise Exception("Deck not assigned to this group")
    except Exception as e:
        return jsonify(message=f'Deck remove failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/messages', methods=['POST'])
@cross_origin(supports_credentials=True)
def messageGroup(id):
    '''Posts a new message to the given group's chat thread'''
    try:
        data = request.get_json()
        time = datetime.now()
        msg = {
            'user': data['email'],
            'timestamp': time.strftime("%x") + " " + time.strftime("%X"),
            'message': data['message']
        }
        message_thread = db.child("messages").child(id).get().val()
        if message_thread != None:
            message_thread.append(msg)
            db.child("messages").child(id).set(message_thread)
        else:
            db.child("messages").child(id).set([msg])
        return jsonify(message='Message posted successfully', status=200), 200
    except Exception as e:
        return jsonify(message=f'Message posting failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/messages', methods=['GET'])
@cross_origin(supports_credentials=True)
def getGroupMessages(id):
    '''Retrieves all messages from the given group's chat thread'''
    try:
        message_thread = db.child("messages").child(id).get().val()
        if message_thread != None:
            return jsonify(chat=message_thread, message='Message returned successfully', status=200), 200
        else:
            return jsonify(chat=[], message='No messages found', status=200), 200
    except Exception as e:
        return jsonify(message=f'Message retrieval failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/notifications', methods=['PUT'])
@cross_origin(supports_credentials=True)
def setGroupNotifications(id):
    '''Sets notifications for all members of a group'''
    try:
        data = request.get_json()
        members = data['members']
        db.child("notifications").child(id).set(members)
        return jsonify(message='Notifications updated succesfully', status=200), 200
    except Exception as e:
        return jsonify(message=f'Notifications update failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/notifications', methods=['GET'])
@cross_origin(supports_credentials=True)
def getGroupNotifications(id):
    '''Retrieves all notifications for a given group'''
    try:
        notifications = db.child("notifications").child(id).get().val()
        if notifications != None:
            return jsonify(notifications=notifications, message='Notifications returned successfully', status=200), 200
        else:
            return jsonify(notifications=[], message='No notifications found', status=200), 200
    except Exception as e:
        return jsonify(message=f'Notification retrieval failed {e}', status=400), 400
    
@group_bp.route('/group/<id>/notifications/clear', methods=['PUT'])
@cross_origin(supports_credentials=True)
def clearGroupNotification(id):
    '''Retrieves all notifications for a given group'''
    try:
        data = request.get_json()
        user = data['user']
        notifications = db.child("notifications").child(id).get().val()
        if notifications != None and user in notifications:
            notifications.remove(user)
            db.child("notifications").child(id).set(notifications)
            return jsonify(message='Notifications updated successfully', status=200), 200
        else:
            return jsonify(message='No notifications to change', status=200), 200
    except Exception as e:
        return jsonify(message=f'Notification update failed {e}', status=400), 400