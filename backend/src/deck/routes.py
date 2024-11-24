#MIT License
#
#Copyright (c) 2022 John Damilola, Leo Hsiang, Swarangi Gaurkar, Kritika Javali, Aaron Dias Barreto
#
#Permission is hereby granted, free of charge, to any person obtaining a copy
#of this software and associated documentation files (the "Software"), to deal
#in the Software without restriction, including without limitation the rights
#to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
#copies of the Software, and to permit persons to whom the Software is
#furnished to do so, subject to the following conditions:
#
#The above copyright notice and this permission notice shall be included in all
#copies or substantial portions of the Software.
#
#THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
#AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
#SOFTWARE.

'''routes.py is a file in deck folder that has all the functions defined that manipulate the deck. All CRUD functions are defined here.'''
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from datetime import datetime

try:
    from .. import firebase
except ImportError:
    from __init__ import firebase


deck_bp = Blueprint('deck_bp', __name__)
db = firebase.database()

@deck_bp.route('/deck/<id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def getdeck(id):
    '''This method fetches a specific deck by its ID.'''
    try:
        deck = db.child("deck").child(id).get()
        return jsonify(
            deck=deck.val(),
            message='Fetched deck successfully',
            status=200
        ), 200
    except Exception as e:
        return jsonify(
            decks=[],
            message=f"An error occurred: {e}",
            status=400
        ), 400

@deck_bp.route('/deck/all', methods=['GET'])
@cross_origin(supports_credentials=True)
def getdecks():
    '''Fetch all decks. Shows private decks for authenticated users and public decks for non-authenticated users.'''
    args = request.args
    localId = args.get('localId')
    
    try:
        decks = []
        if localId:
            user_decks = db.child("deck").order_by_child("userId").equal_to(localId).get()
            for deck in user_decks.each():
                obj = deck.val()
                obj['id'] = deck.key()
                cards = db.child("card").order_by_child("deckId").equal_to(deck.key()).get()
                obj['cards_count'] = len(cards.val()) if cards.val() else 0
                decks.append(obj)
        else:
            alldecks = db.child("deck").order_by_child("visibility").equal_to("public").get()
            for deck in alldecks.each():
                obj = deck.val()
                obj['id'] = deck.key()
                cards = db.child("card").order_by_child("deckId").equal_to(deck.key()).get()
                obj['cards_count'] = len(cards.val()) if cards.val() else 0
                decks.append(obj)

        return jsonify(decks=decks, message='Fetching decks successfully', status=200), 200
    except Exception as e:
        return jsonify(decks=[], message=f"An error occurred {e}", status=400), 400

@deck_bp.route('/deck/create', methods=['POST'])
@cross_origin(supports_credentials=True)
def create():
    '''Create a new deck.'''
    try:
        data = request.get_json()
        localId = data['localId']
        title = data['title']
        description = data['description']
        visibility = data['visibility']
        
        db.child("deck").push({
            "userId": localId,
            "title": title,
            "description": description,
            "visibility": visibility,
            "cards_count": 0,
            "lastOpened": None
        })

        return jsonify(message='Create Deck Successful', status=201), 201
    except Exception as e:
        return jsonify(message=f'Create Deck Failed {e}', status=400), 400

@deck_bp.route('/deck/update/<id>', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def update(id):
    '''Update an existing deck.'''
    try:
        data = request.get_json()
        localId = data['localId']
        title = data['title']
        description = data['description']
        visibility = data['visibility']

        db.child("deck").child(id).update({
            "userId": localId,
            "title": title,
            "description": description,
            "visibility": visibility
        })

        return jsonify(message='Update Deck Successful', status=201), 201
    except Exception as e:
        return jsonify(message=f'Update Deck Failed {e}', status=400), 400

@deck_bp.route('/deck/delete/<id>', methods=['DELETE'])
@cross_origin(supports_credentials=True)
def delete(id):
    '''Delete a deck.'''
    try:
        db.child("deck").child(id).remove()
        return jsonify(message='Delete Deck Successful', status=200), 200
    except Exception as e:
        return jsonify(message=f'Delete Deck Failed {e}', status=400), 400

@deck_bp.route('/deck/updateLastOpened/<id>', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def update_last_opened(id):
    '''Update the lastOpened timestamp when a deck is opened.'''
    try:
        current_time = datetime.utcnow().isoformat()
        db.child("deck").child(id).update({"lastOpened": current_time})
        return jsonify(message='Deck lastOpened updated successfully', status=200), 200
    except Exception as e:
        return jsonify(message=f'Failed to update lastOpened: {e}', status=400), 400



@deck_bp.route('/deck/<deckId>/leaderboard', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_leaderboard(deckId):
    '''This endpoint fetches the leaderboard data for a specific deck.'''
    try:
        # Fetch leaderboard data for the given deck
        leaderboard_entries = db.child("leaderboard").child(deckId).get()
        leaderboard = []
        for entry in leaderboard_entries.each():
            data = entry.val()
            leaderboard.append({
                "userEmail": data.get("userEmail"),
                "correct": data.get("correct", 0),
                "incorrect": data.get("incorrect", 0),
                "lastAttempt": data.get("lastAttempt")
            })

        # Sort leaderboard by score (correct answers) then by last attempt (descending)
        leaderboard.sort(key=lambda x: (x["correct"], x["lastAttempt"]), reverse=True)

        return jsonify({
            "leaderboard": leaderboard,
            "message": "Leaderboard data fetched successfully",
            "status": 200
        }), 200
    except Exception as e:
        return jsonify({
            "leaderboard": [],
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400
    
@deck_bp.route('/deck/<deck_id>/update-leaderboard', methods=['POST'])
@cross_origin(supports_credentials=True)
def update_leaderboard(deck_id):
    try:
        data = request.get_json()
        # Extract values from the request body
        user_id = data.get("userId")  # Get userId from request body
        user_email = data.get("userEmail")  # Keep for logging or notification
        correct = data.get("correct")
        incorrect = data.get("incorrect")

        if not user_id:
            return jsonify({"message": "User ID is required"}), 400  # Validate userId presence

        # Use user_id from request body to update the leaderboard
        leaderboard_ref = db.child("leaderboard").child(deck_id).child(user_id)
        leaderboard_ref.update({
            "userEmail": user_email,
            "correct": correct,
            "incorrect": incorrect,
            "lastAttempt": datetime.now().isoformat()
        })

        return jsonify({"message": "Leaderboard updated successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to update leaderboard", "error": str(e)}), 500
    
@deck_bp.route('/deck/<deckId>/user-score/<userId>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_user_score(deckId, userId):
    '''This endpoint fetches the user's score for a specific deck. If the user doesn't exist, return zero for all score values.'''
    try:
        # Fetch the user's leaderboard entry for the specified deck
        leaderboard_entry = db.child("leaderboard").child(deckId).child(userId).get()

        if leaderboard_entry.val() is not None:  # Check if the entry has data
            data = leaderboard_entry.val()  # Get the value of the entry
            score_data = {
                "correct": data.get("correct", 0),
                "incorrect": data.get("incorrect", 0),
            }
            return jsonify({
                "score": score_data,
                "message": "User score fetched successfully",
                "status": 200
            }), 200
        else:
            # Return zero for all score values if no entry exists
            return jsonify({
                "score": {
                    "correct": 0,
                    "incorrect": 0
                },
                "message": "No score found for the user, returning zeros.",
                "status": 200  # Not Found status, as the user has no scores yet
            }), 200

    except Exception as e:
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400

# @deck_bp.route('/deck/<id>/last-opened', methods=['PATCH'])
# @cross_origin(supports_credentials=True)
# def update_last_opened_deck(id):
#     try:
#         data = request.get_json()
#         last_opened_at = data.get('lastOpenedAt')
        
#         db.child("deck").child(id).update({
#             "lastOpenedAt": last_opened_at
#         })

#         return jsonify(
#             message='Last opened time updated successfully',
#             status=200
#         ), 200
#     except Exception as e:
#         return jsonify(
#             message=f"Failed to update last opened time: {e}",
#             status=400
#         ), 400

@deck_bp.route('/deck/<deckId>/share', methods=['POST'])
@cross_origin(supports_credentials=True)
def share_deck_with_user(deckId):
    try:
        data = request.get_json()
        userId = data['userId']
        share_list = db.child("sharing").child(userId).get().val()
        if share_list != None and deckId not in share_list:
            share_list.append(deckId)
            db.child("sharing").child(userId).set(share_list)
            return jsonify(message='Deck shared successfully', status=200), 200
        elif share_list == None:
            db.child("sharing").child(userId).set([deckId])
            return jsonify(message='Deck shared successfully', status=200), 200
        else:
            raise Exception("Deck already shared with this user")
    except Exception as e:
        return jsonify(message=f'Deck share failed {e}', status=400), 400