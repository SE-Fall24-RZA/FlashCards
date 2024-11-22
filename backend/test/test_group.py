from flask import Flask
import sys
sys.path.append('backend/src')
import unittest
from unittest.mock import patch, MagicMock, ANY
import json
from src.auth.routes import auth_bp
from src.deck.routes import deck_bp
from src.cards.routes import card_bp
from src.groups.routes import group_bp
from datetime import datetime
import pytest
from pathlib import Path
from unittest.mock import call

# Add the parent directory to sys.path
sys.path.append(str(Path(__file__).parent.parent))

class TestDeck(unittest.TestCase):
    @classmethod
    def setUp(self):
        self.app=Flask(__name__, instance_relative_config=False)
        self.app.register_blueprint(group_bp)
        self.app=self.app.test_client()
        response=self.app.get('/group/all',query_string=dict(localId='TestUser'))
        response_data = json.loads(response.data)
        if response and response_data:
            for grp in response_data["groups"]:
                self.app.delete("/group/" + grp["id"])

    def test_post_group(self):
        with self.app:
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            response1 = self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup1', description='Testing Group 1')), content_type='application/json')
            assert response1.status_code == 201
            response2=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response2_data = json.loads(response2.data)
            assert len(response0_data["groups"]) + 1 == len(response2_data["groups"])

    def test_add_member_to_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup2', description='Testing Group 2')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup2":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            response1 = self.app.patch('/group/' + thisGroup + "/addMember", data=json.dumps(
                dict(localId="TestUser2", email='Test2Email@email.com', key=joinKey)),
                content_type='application/json')
            assert response1.status_code == 200
            response2 = self.app.get('/group/' + thisGroup)
            response2_data = json.loads(response2.data)
            assert dict(email='Test2Email@email.com', userId="TestUser2") in response2_data["group"]["members"]

    def test_remove_member_from_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup3', description='Testing Group 3')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup3":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            self.app.patch('/group/' + thisGroup + "/addMember", data=json.dumps(
                dict(localId="TestUser2", email='Test2Email@email.com', key=joinKey)),
                content_type='application/json')
            response1 = self.app.get('/group/' + thisGroup)
            response1_data = json.loads(response1.data)
            assert len(response1_data["group"]["members"]) == 2
            response2 = self.app.patch('/group/' + thisGroup + "/removeMember", data=json.dumps(
                dict(userId="TestUser2")),
                content_type='application/json')
            print(response2)
            assert response2.status_code == 200
            response3 = self.app.get('/group/' + thisGroup)
            response3_data = json.loads(response3.data)
            assert len(response3_data["group"]["members"]) == 1
            assert dict(email='Test2Email@email.com', userId="TestUser2") not in response3_data["group"]["members"]

    def test_update_group_info(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup4', description='Testing Group 4')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup4":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            response1 = self.app.patch('/group/' + thisGroup + "/update", data=json.dumps(
                dict(group_name="New TestGroup4", description='New Testing Group 4')),
                content_type='application/json')
            assert response1.status_code == 200
            response2 = self.app.get('/group/' + thisGroup)
            response2_data = json.loads(response2.data)
            assert "New TestGroup4" == response2_data["group"]["group_name"]
            assert "New Testing Group 4" == response2_data["group"]["description"]

    def test_delete_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup5', description='Testing Group 5')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup5":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            response1 = self.app.delete('/group/' + thisGroup)
            assert response1.status_code == 200
            response2 = self.app.get('/group/' + thisGroup)
            print(json.loads(response2.data))
            assert response2.status_code == 404

    def test_add_deck_to_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup6', description='Testing Group 6')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup6":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            response1 = self.app.get('/group/' + thisGroup)
            response1_data = json.loads(response1.data)
            assert "decks" not in response1_data["group"].keys()
            response2 = self.app.patch('/group/' + thisGroup + '/addDeck', data=json.dumps(
                dict(id='TestDeck', title='Test Deck', description='Testing Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            assert response2.status_code == 200
            response3 = self.app.get('/group/' + thisGroup)
            response3_data = json.loads(response3.data)
            assert len(response3_data["group"]["decks"]) == 1
            assert response3_data["group"]["decks"][0]["id"] == 'TestDeck'

    def test_remove_deck_from_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup7', description='Testing Group 7')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup7":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            self.app.patch('/group/' + thisGroup + '/addDeck', data=json.dumps(
                dict(id='TestDeck', title='Test Deck', description='Testing Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            response1 = self.app.get('/group/' + thisGroup)
            response1_data = json.loads(response1.data)
            assert len(response1_data["group"]["decks"]) == 1
            response2 = self.app.patch('/group/' + thisGroup + '/removeDeck', data=json.dumps(
                dict(id='TestDeck', title='Test Deck', description='Testing Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            assert response2.status_code == 200
            response3 = self.app.get('/group/' + thisGroup)
            response3_data = json.loads(response3.data)
            assert "decks" not in response3_data["group"].keys()

    def test_add_member_wrong_join_key(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroupError', description='Testing Group with Error')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroupError":
                    thisGroup = grp["id"]
                    break
            response1 = self.app.patch('/group/' + thisGroup + "/addMember", data=json.dumps(
                dict(localId="TestUser2", email='Test2Email@email.com', key="WrongKey")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/' + thisGroup)
            response2_data = json.loads(response2.data)
            assert dict(email='Test2Email@email.com', userId="TestUser2") not in response2_data["group"]["members"]

    def test_post_group_missing_info(self):
        with self.app:
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            response1 = self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroupError', )), content_type='application/json')
            assert response1.status_code == 400
            response2=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response2_data = json.loads(response2.data)
            assert len(response0_data["groups"]) == len(response2_data["groups"])

    def test_update_group__missing_info(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroupError', description='Testing Group Error')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroupError":
                    thisGroup = grp["id"]
                    break
            response1 = self.app.patch('/group/' + thisGroup + "/update", data=json.dumps(
                dict(group_name="No Description")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/' + thisGroup)
            response2_data = json.loads(response2.data)
            assert "TestGroupError" == response2_data["group"]["group_name"]
            assert "Testing Group Error" == response2_data["group"]["description"]

    def test_update_nonexistant_group_info(self):
        with self.app:
            response1 = self.app.patch('/group/NotARealGroup/update', data=json.dumps(
                dict(group_name='TestGroupError', description='Testing Group Error')),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotARealGroup')
            assert response2.status_code == 404

    def test_nonexistant_group_add_member(self):
        with self.app:
            response1 = self.app.patch('/group/NotARealGroup/addMember',data=json.dumps(
                dict(localId="TestUser2", email='Test2Email@email.com', key="Key")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotARealGroup')
            assert response2.status_code == 404

    def test_nonexistant_group_remove_member(self):
        with self.app:
            response1 = self.app.patch('/group/NotARealGroup/removeMember',data=json.dumps(
                dict(localId="TestUser2", email='Test2Email@email.com', key="Key")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotARealGroup')
            assert response2.status_code == 404

    def test_remove_member_not_in_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroupError', description='Testing Group Error')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            joinKey = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroupError":
                    thisGroup = grp["id"]
                    joinKey = grp["join_key"]
                    break
            response1 = self.app.patch('/group/' + thisGroup + "/removeMember", data=json.dumps(
                dict(userId="TestUser2")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/' + thisGroup)
            response2_data = json.loads(response2.data)
            assert len(response2_data["group"]["members"]) == 1
            assert dict(email='Test2Email@email.com', userId="TestUser2") not in response2_data["group"]["members"]

    def test_add_deck_missing_info(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroupError', description='Testing Group Error')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroupError":
                    thisGroup = grp["id"]
                    break
            response1 = self.app.get('/group/' + thisGroup)
            response1_data = json.loads(response1.data)
            assert "decks" not in response1_data["group"].keys()
            response2 = self.app.patch('/group/' + thisGroup + '/addDeck', data=json.dumps(
                dict(id='TestDeck', title='Missing info')),
                content_type='application/json')
            assert response2.status_code == 400
            response3 = self.app.get('/group/' + thisGroup)
            response3_data = json.loads(response3.data)
            assert "decks" not in response1_data["group"].keys()

    def test_nonexistant_group_add_deck(self):
        with self.app:
            response1 = self.app.patch('/group/NotARealGroup/addDeck',data=json.dumps(
                dict(id='TestDeck', title='Test Deck', description='Testing Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotARealGroup')
            assert response2.status_code == 404

    def test_nonexistant_group_remove_deck(self):
        with self.app:
            response1 = self.app.patch('/group/NotARealGroup/removeDeck',data=json.dumps(
                dict(id='TestDeck')),
                content_type='application/json')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotARealGroup')
            assert response2.status_code == 404

    def test_remove_deck_not_in_group(self):
        with self.app:
            self.app.post('/group/create', data=json.dumps(
                dict(localId='TestUser', email='TestEmail@email.com', group_name='TestGroup7', description='Testing Group 7')),
                content_type='application/json')
            response0=self.app.get('/group/all',query_string=dict(localId='TestUser'))
            response0_data = json.loads(response0.data)
            thisGroup = ""
            for grp in response0_data["groups"]:
                if grp["group_name"] == "TestGroup7":
                    thisGroup = grp["id"]
                    break
            self.app.patch('/group/' + thisGroup + '/addDeck', data=json.dumps(
                dict(id='TestDeck', title='Test Deck', description='Testing Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            response1 = self.app.get('/group/' + thisGroup)
            response1_data = json.loads(response1.data)
            assert len(response1_data["group"]["decks"]) == 1
            response2 = self.app.patch('/group/' + thisGroup + '/removeDeck', data=json.dumps(
                dict(id='NotRealDeck', title='Not Real Deck', description='Not a real Deck', visibility="private", cards_count=0, owner="TestUser")),
                content_type='application/json')
            assert response2.status_code == 400
            response3 = self.app.get('/group/' + thisGroup)
            response3_data = json.loads(response3.data)
            assert len(response3_data["group"]["decks"]) == 1

    def test_delete_nonexistant_group(self):
        with self.app:
            response1 = self.app.delete('/group/NotRealGroup')
            assert response1.status_code == 400
            response2 = self.app.get('/group/NotRealGroup')
            print(json.loads(response2.data))
            assert response2.status_code == 404

    def test_get_missing_user_id(self):
        with self.app:
            response = self.app.get('/group/all')
            assert response.status_code == 400