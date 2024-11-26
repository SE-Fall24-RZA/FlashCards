## Backend Installation Steps

1. Clone the repository using `git clone https://github.com/SE-Fall24-RZA/FlashCards.git`
2. Ensure you are on the most updated branch
3. Create a virtual python environment (if desired) and set the Python version to be `3.9.x`
4.  Navigate to `FlashCards/backend` and run `pip install -r requirements.txt`
5. Navigate to `FlashCards/backend/src`; make a copy of `\_\_init\_\_.sample` and name the file `\_\_init\_\_.py`
6. Set up [Firebase](https://firebase.google.com/):
    1. Go to [Firebase](https://firebase.google.com/)
    2. Login/Register your account
    3. Click on add project
    4. Give project name
    5. Optional: select google analytics
    6. Create project
    7. Under "Get started by adding Firebase to your app", click on web app
    8. Name the web app
    9. From the left side menu, select "All products."
    10. Select "Realtime Database," and follow the prompts to enable the database for this project (select "start in locked mode" when prompted)
    11. Navigate to the rules tab, replace the existing ruleset with the following, and press publish:
    ```
    {
        "rules": {
            "folder_deck": {
                ".read": true,
                ".write": true,
                ".indexOn": ["folderId"]
            },
            "add-deck": {
                ".read": true,
                ".write": true
            },
            "addToFolder": {
                ".read": true,
                ".write": true
            },
            "folder": {
                ".read": true,
                ".write": true,
                ".indexOn": ["userId"]
            },
            "folders": {
                ".read": true,
                ".write": true
            },
            "deck": {
                ".indexOn": ["id", "userId", "visibility"],
                ".read": true,
                ".write": true
            },
            "card": {
                ".indexOn": ["deckId"],
                ".read": true,
                ".write": true
            },
            "leaderboard": {
                ".read": true,  // Adjust if needed
                ".write": true, // Adjust if needed
                ".indexOn": ["deckId", "correct", "lastAttempt"]  // Suitable for sorting
            },
            "group": {
                ".read": true,
                ".write": true
            },
            "sharing": {
                ".read": true,
                ".write": true
            },
            "quizAttempts": {
                ".read": true,
                ".write": true,
                ".indexOn" : ["deckId", "userId", "attemptId"]
            },
            "streaks": {
                ".read": true,
                ".write": true
            },
            "messages": {
                ".read": true,
                ".write": true
            },
            "notifications": {
                ".read": true,
                ".write": true
            }
        }
    }
    ```
    12. From the left side menu, select "Project settings"
    13. Scroll down, copy the "apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId", and "measurementId" values from the code given here and paste them into the matching field in `\_\_init\_\_.py`
    10. Return to Firebase console, click on Authentication (On the left sidebar), click on sign-in method, and enable email/password sign in
7. To start the backend api server, Navigate to `FlashCards/backend/src` and run `python api.py`


### Heroku Deployment Steps (optional, for deployment only)
1. ```heroku login```

2. ```heroku create flashcards-server-api```

3. ```heroku create --buildpack https://github.com/heroku/heroku-buildpack-python.git```

4. ```heroku ps:scale web=1```

5. ```git remote add heroku https://git.heroku.com/flashcards-server-api.git```

6. ```git subtree push --prefix backend heroku local_branch:main```


