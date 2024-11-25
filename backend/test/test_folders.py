import json
import unittest
from unittest.mock import patch, MagicMock, Mock
from flask import Flask
from src.folders.routes import folder_bp  # Adjust the import based on your app structure
import sys
from pathlib import Path

# Add the parent directory to sys.path
sys.path.append(str(Path(__file__).parent.parent))

class TestFolders(unittest.TestCase):
    @classmethod
    def setUp(cls):
        cls.app = Flask(__name__, instance_relative_config=False)
        cls.app.register_blueprint(folder_bp)
        cls.app = cls.app.test_client()

    @patch('src.folders.routes.db')
    def test_get_folders_success(self, mock_db):
        '''Test successful fetch of all folders for a user'''
        user_id = "test_user_id"
        
        # Mock folder data
        mock_folders_data = [
            MagicMock(key=lambda: 'folder_id_1', val=lambda: {"name": "Folder 1", "userId": user_id}),
            MagicMock(key=lambda: 'folder_id_2', val=lambda: {"name": "Folder 2", "userId": user_id}),
        ]
        
        # Configure mock database response for folders
        mock_db.child.return_value.order_by_child.return_value.equal_to.return_value.get.return_value.each.return_value = mock_folders_data

        response = self.app.get(f'/folders/all?userId={user_id}')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        
        # Assert the response data is as expected
        assert len(response_data['folders']) == 2
        assert response_data['folders'][0]['name'] == "Folder 1"
        assert response_data['folders'][1]['name'] == "Folder 2"

    def test_get_folders_no_user_id(self):
        '''Test fetch all folders without userId returns error'''
        response = self.app.get(f'/folders/all')
        assert response.status_code == 400

    @patch('src.folders.routes.db')
    def test_create_folder_success(self, mock_db):
        '''Test successful folder creation'''
        mock_db.child.return_value.push.return_value = {"name": "folder_id"}  # Simulate a folder reference
        folder_data = {"name": "My New Folder", "userId": "test_user_id"}

        response = self.app.post('/folder/create', data=json.dumps(folder_data), content_type='application/json')
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['folder']['name'] == "My New Folder"
        assert response_data['message'] == 'Folder created successfully'

    @patch('src.folders.routes.db')
    def test_create_folder_error(self, mock_db):
        '''Test folder creation failure due to missing data'''
        folder_data = {"userId": "test_user_id"}  # Missing name
        response = self.app.post('/folder/create', data=json.dumps(folder_data), content_type='application/json')
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert "Failed to create folder" in response_data['message']

    @patch('src.folders.routes.db')
    def test_update_folder_success(self, mock_db):
        '''Test successful folder update'''
        folder_id = "folder_id"
        mock_db.child.return_value.child.return_value.update.return_value = None  # Simulate successful update
        folder_data = {"name": "Updated Folder Name"}

        response = self.app.patch(f'/folder/update/{folder_id}', data=json.dumps(folder_data), content_type='application/json')
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Folder updated successfully'

    @patch('src.folders.routes.db')
    def test_update_folder_error(self, mock_db):
        '''Test folder update failure'''
        folder_id = "folder_id"
        folder_data = {"name": "Updated Folder Name"}

        mock_db.child.return_value.child.return_value.update.side_effect = Exception("Update failed")
        
        response = self.app.patch(f'/folder/update/{folder_id}', data=json.dumps(folder_data), content_type='application/json')
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert "Failed to update folder" in response_data['message']

    @patch('src.folders.routes.db')
    def test_delete_folder_success(self, mock_db):
        '''Test successful folder deletion'''
        folder_id = "folder_id"
        mock_db.child.return_value.child.return_value.remove.return_value = None  # Simulate successful removal

        response = self.app.delete(f'/folder/delete/{folder_id}')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Folder deleted successfully'

    @patch('src.folders.routes.db')
    def test_delete_folder_error(self, mock_db):
        '''Test folder deletion failure'''
        folder_id = "folder_id"
        mock_db.child.return_value.child.return_value.remove.side_effect = Exception("Delete failed")

        response = self.app.delete(f'/folder/delete/{folder_id}')
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert "Failed to delete folder" in response_data['message']

    @patch('src.folders.routes.db')
    def test_add_deck_to_folder_success(self, mock_db):
        '''Test successful addition of a deck to a folder'''
        deck_data = {"folderId": "folder_id", "deckId": "deck_id"}
        response = self.app.post('/deck/add-deck', data=json.dumps(deck_data), content_type='application/json')
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Deck added to folder successfully'

    @patch('src.folders.routes.db')
    def test_add_deck_to_folder_error(self, mock_db):
        '''Test failure when adding a deck to a folder'''
        deck_data = {"folderId": "folder_id", "deckId": "deck_id"}
        mock_db.child.return_value.push.side_effect = Exception("Add failed")

        response = self.app.post('/deck/add-deck', data=json.dumps(deck_data), content_type='application/json')
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert "Failed to add deck to folder" in response_data['message']

    @patch('src.folders.routes.db')
    def test_remove_deck_from_folder_success(self, mock_db):
        '''Test successful removal of a deck from a folder'''
        deck_data = {"folderId": "folder_id", "deckId": "deck_id"}

        mock_query = mock_db.child.return_value.order_by_child.return_value.equal_to.return_value.get.return_value
        mock_fd = Mock() 
        mock_fd.val.return_value = {"deckId": "deck_id"}
        mock_fd.key.return_value = "mock_key"
        mock_query.each.return_value = [mock_fd]  # Simulate matching records

        response = self.app.delete('/folder/remove-deck', data=json.dumps(deck_data), content_type='application/json')
        assert response.status_code == 200

        response_data = json.loads(response.data)
        assert response_data['message'] == 'Deck removed from folder successfully'

        mock_db.child.return_value.child.return_value.remove.assert_called_once_with()


    @patch('src.folders.routes.db')
    def test_remove_deck_from_folder_error(self, mock_db):
        '''Test failure when removing a deck from a folder'''
        deck_data = {"folderId": "folder_id", "deckId": "deck_id"}

        mock_db.child.return_value.order_by_child.return_value.equal_to.return_value.get.side_effect = Exception("Remove failed")

        response = self.app.delete('/folder/remove-deck', data=json.dumps(deck_data), content_type='application/json')
        assert response.status_code == 400

        response_data = json.loads(response.data)
        assert "Failed to remove deck from folder" in response_data['message']

    @patch('src.folders.routes.db')
    def test_get_decks_for_folder_success(self, mock_db):
        '''Test successful retrieval of decks for a folder'''
        folder_id = "folder_id"

        # Mock the folder_deck response for folder decks query
        mock_folder_deck_data = [
            MagicMock(key=lambda: 'deck_id_1', val=lambda: {"deckId": "deck_id_1"}),
            MagicMock(key=lambda: 'deck_id_2', val=lambda: {"deckId": "deck_id_2"}),
        ]
        mock_db.child.return_value.order_by_child.return_value.equal_to.return_value.get.return_value.each.return_value = mock_folder_deck_data

        # Mock the individual deck data for each deck in the deck list
        mock_deck_1 = MagicMock(val=lambda: {"title": "Deck 1"})
        mock_deck_2 = MagicMock(val=lambda: {"title": "Deck 2"})
        mock_db.child.return_value.child.return_value.get.side_effect = [mock_deck_1, mock_deck_2]

        # Make the API call
        response = self.app.get(f'/decks/{folder_id}')

        # Assert response status and data
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert len(response_data['decks']) == 2
        assert response_data['decks'][0]['title'] == "Deck 1"
        assert response_data['decks'][1]['title'] == "Deck 2"

    @patch('src.folders.routes.db')
    def test_get_decks_for_folder_error(self, mock_db):
        '''Test failure when retrieving decks for a folder'''
        folder_id = "folder_id"
        mock_db.child.return_value.order_by_child.return_value.equal_to.return_value.get.side_effect = Exception("Retrieval failed")

        response = self.app.get(f'/decks/{folder_id}')
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert "An error occurred: Retrieval failed" in response_data['message']