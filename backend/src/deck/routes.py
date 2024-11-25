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
from datetime import datetime, timedelta
from statistics import mean

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
    
@deck_bp.route('/deck/<deckId>/analysis', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_deck_analysis(deckId):
    '''This endpoint fetches analysis data for a specific deck.'''
    try:
        # Fetch leaderboard data for the given deck
        leaderboard_entries = db.child("leaderboard").child(deckId).get()
        if not leaderboard_entries.each():
            return jsonify({
                "message": "No data available for analysis.",
                "status": 404
            }), 404

        total_correct = 0
        total_incorrect = 0
        total_attempts = 0
        all_correct_scores = []
        all_incorrect_scores = []

        for entry in leaderboard_entries.each():
            data = entry.val()
            correct = data.get("correct", 0)
            incorrect = data.get("incorrect", 0)
            attempts = correct + incorrect

            total_correct += correct
            total_incorrect += incorrect
            total_attempts += attempts

            all_correct_scores.append(correct)
            all_incorrect_scores.append(incorrect)

        # Calculate averages
        avg_correct = mean(all_correct_scores) if all_correct_scores else 0
        avg_incorrect = mean(all_incorrect_scores) if all_incorrect_scores else 0
        avg_attempts = total_attempts / len(all_correct_scores) if all_correct_scores else 0

        analysis_data = {
            "total_correct": total_correct,
            "total_incorrect": total_incorrect,
            "total_attempts": total_attempts,
            "average_correct": avg_correct,
            "average_incorrect": avg_incorrect,
            "average_attempts": avg_attempts,
        }

        return jsonify({
            "analysis": analysis_data,
            "message": "Analysis data fetched successfully",
            "status": 200
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400
    
@deck_bp.route('/deck/<deckId>/add-quiz-attempt', methods=['POST'])
@cross_origin(supports_credentials=True)
def add_quiz_attempt(deckId):
    '''This endpoint adds a new quiz attempt to the quizAttempts node.'''
    try:
        data = request.get_json()
        user_id = data.get("userId")
        user_email = data.get("userEmail")
        correct = data.get("correct", 0)
        incorrect = data.get("incorrect", 0)
        last_attempt = data.get("lastAttempt", "")

        # Sanitize lastAttempt to make it a valid Firebase path (replace invalid characters)
        sanitized_last_attempt = last_attempt.replace(":", "-").replace(".", "-")

        # Add the new quiz attempt to the quizAttempts node
        db.child("quizAttempts").child(deckId).child(user_id).child(sanitized_last_attempt).set({
            "userEmail": user_email,
            "correct": correct,
            "incorrect": incorrect,
            "lastAttempt": last_attempt,
        })

        return jsonify({
            "message": "Quiz attempt added successfully.",
            "status": 200
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400

@deck_bp.route('/deck/<deckId>/user-progress/<userId>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_user_progress(deckId, userId):
    '''This endpoint fetches the user's progress over time for a specific deck from quiz attempts.'''
    try:
        # Fetch all the quiz attempts for the specified deck and user
        user_progress_entries = db.child("quizAttempts").child(deckId).child(userId).get()

        if user_progress_entries.val() is None:
            # If no quiz attempts found, return an empty progress list and a message
            return jsonify({
                "progress": [],
                "message": "No progress data found for the user.",
                "status": 404
            }), 404

        progress_data = user_progress_entries.val()
        progress_over_time = []

        # Iterate through all quiz attempts, which are nested under timestamp keys
        for timestamp, attempt in progress_data.items():
            # Extract and format the date from 'lastAttempt' (assuming it's in ISO format)
            last_attempt = attempt.get("lastAttempt", "")
            if last_attempt:
                try:
                    # Remove the 'Z' at the end of the timestamp (UTC indicator)
                    last_attempt = last_attempt.rstrip('Z')
                    # Convert the 'lastAttempt' timestamp to a date string (YYYY-MM-DD)
                    formatted_date = datetime.fromisoformat(last_attempt).strftime('%Y-%m-%d')
                except ValueError:
                    # In case the date is not valid, set formatted_date to None
                    formatted_date = None
            else:
                formatted_date = None

            # Add each quiz attempt's data to the list
            progress_over_time.append({
                "userEmail": attempt.get("userEmail", ""),
                "correct": attempt.get("correct", 0),
                "incorrect": attempt.get("incorrect", 0),
                "lastAttempt": last_attempt,
                "date": formatted_date,  # Add the formatted date here
                "total_attempts": attempt.get("correct", 0) + attempt.get("incorrect", 0),
            })

        # Return the structured response
        return jsonify({
            "progress": progress_over_time,
            "message": "User progress fetched successfully",
            "status": 200
        }), 200

    except Exception as e:
        # Handle any exceptions that occur
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400


@deck_bp.route('/deck/<deckId>/performance-trends', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_deck_performance_trends(deckId):
    '''This endpoint fetches performance trends for the entire deck over time.'''
    try:
        # Fetch all entries for the deck
        leaderboard_entries = db.child("leaderboard").child(deckId).get()
        if not leaderboard_entries.each():
            return jsonify({
                "message": "No performance data available.",
                "status": 404
            }), 404

        trends = {}

        for entry in leaderboard_entries.each():
            data = entry.val()
            date = datetime.fromisoformat(data.get("lastAttempt")).strftime('%Y-%m-%d')
            correct = data.get("correct", 0)
            incorrect = data.get("incorrect", 0)

            # Aggregate scores by date
            if date not in trends:
                trends[date] = {"correct": 0, "incorrect": 0, "attempts": 0}
            trends[date]["correct"] += correct
            trends[date]["incorrect"] += incorrect
            trends[date]["attempts"] += (correct + incorrect)

        # Convert trends dict to a sorted list by date
        sorted_trends = [
            {"date": date, **data}
            for date, data in sorted(trends.items())
        ]

        return jsonify({
            "trends": sorted_trends,
            "message": "Performance trends fetched successfully",
            "status": 200
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400
    
@deck_bp.route('/user/streak', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_user_streak():
    '''Fetch the user's current streak data.'''
    user_id = request.args.get('userId')
    
    try:
        # Retrieve streak information for the user
        user_streak = db.child("streaks").child(user_id).get().val()
        if not user_streak:
            # If no streak data exists, return default values
            user_streak = {
                "currentStreak": 0,
                "lastPracticeDate": None
            }

        return jsonify({
            "streak": user_streak,
            "message": "Streak data fetched successfully",
            "status": 200
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"An error occurred: {e}",
            "status": 400
        }), 400

    
@deck_bp.route('/deck/practice', methods=['POST'])
@cross_origin(supports_credentials=True)
def log_practice():
    '''Log a practice session and update the streak.'''
    try:
        data = request.get_json()
        user_id = data['userId']
        deck_id = data['deckId']
        current_date = datetime.utcnow().date()  # Use only date part, ignoring time

        # Retrieve user's current streak data
        user_streak = db.child("streaks").child(user_id).get().val()
        if not user_streak:
            # If no streak data exists, initialize it
            user_streak = {
                "currentStreak": 0,
                "lastPracticeDate": None
            }

        # Check if the practice is on a consecutive day
        last_practice_date = user_streak.get("lastPracticeDate")
        if last_practice_date:
            last_practice_date = datetime.strptime(last_practice_date, "%Y-%m-%d").date()
            
            if (current_date - last_practice_date).days == 1:
                # Consecutive day, increment the streak
                user_streak["currentStreak"] += 1
            elif (current_date - last_practice_date).days > 1:
                # Non-consecutive, reset the streak
                user_streak["currentStreak"] = 1
        else:
            # No previous practice, start the streak
            user_streak["currentStreak"] = 1

        # Update the last practice date
        user_streak["lastPracticeDate"] = current_date.isoformat()

        # Save the updated streak data back to the database
        db.child("streaks").child(user_id).update(user_streak)

        return jsonify(message='Practice logged and streak updated', status=200), 200

    except Exception as e:
        return jsonify(message=f'Failed to log practice: {e}', status=400), 400

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

@deck_bp.route('/deck/share', methods=['POST'])
@cross_origin(supports_credentials=True)
def share_deck_with_user():
    try:
        data = request.get_json()
        userId = data['userId']
        deckId = data['deckId']
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
    
@deck_bp.route('/deck/share', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_shared_decks_with_user():
    args = request.args
    localId = args.get('localId')
    try:
        shared_deck_ids = db.child("sharing").child(localId).get().val()
        shared_deck_list = []
        if shared_deck_ids != None:
            for deck_id in shared_deck_ids:
                deck = db.child("deck").child(deck_id).get().val()
                if deck != None:
                    deck['id'] = deck_id
                    shared_deck_list.append(deck)
        return jsonify(shared_decks=shared_deck_list, message='Fetching shared decks successful', status=200), 200
    except Exception as e:
        return jsonify(message=f'Fetching shared decks failed {e}', status=400), 400
    
@deck_bp.route('/deck/share/remove', methods=['PATCH'])
@cross_origin(supports_credentials=True)
def unshare_deck_with_user():
    try:
        data = request.get_json()
        userId = data['userId']
        deckId = data['deckId']
        share_list = db.child("sharing").child(userId).get().val()
        if share_list != None and deckId in share_list:
            share_list.remove(deckId)
            db.child("sharing").child(userId).set(share_list)
            return jsonify(message='Deck removed successfully', status=200), 200
        else:
            raise Exception("Deck not shared with this user")
    except Exception as e:
        return jsonify(message=f'Deck share failed {e}', status=400), 400