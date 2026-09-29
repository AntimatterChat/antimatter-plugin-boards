// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package storetests

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	storeservice "github.com/mattermost/mattermost-plugin-boards/server/services/store"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"
)

func StoreTestCloudStore(t *testing.T, setup func(t *testing.T) (storeservice.Store, func())) {
	t.Run("GetUsedCardsCount", func(t *testing.T) {
		store, tearDown := setup(t)
		defer tearDown()
		testGetUsedCardsCount(t, store)
	})
}

func testGetUsedCardsCount(t *testing.T, store storeservice.Store) {
	// Generate IDs at function level so they can be shared across subtests
	userID := utils.NewID(utils.IDTypeUser)
	board1ID := utils.NewID(utils.IDTypeBoard)
	board2ID := utils.NewID(utils.IDTypeBoard)
	card1ID := utils.NewID(utils.IDTypeBlock)
	card2ID := utils.NewID(utils.IDTypeBlock)
	card3ID := utils.NewID(utils.IDTypeBlock)
	card4ID := utils.NewID(utils.IDTypeBlock)
	card5ID := utils.NewID(utils.IDTypeBlock)
	textID := utils.NewID(utils.IDTypeBlock)
	viewID := utils.NewID(utils.IDTypeBlock)
	templateID := utils.NewID(utils.IDTypeBoard)
	card6ID := utils.NewID(utils.IDTypeBlock)
	card7ID := utils.NewID(utils.IDTypeBlock)
	card8ID := utils.NewID(utils.IDTypeBlock)
	card9ID := utils.NewID(utils.IDTypeBlock)

	t.Run("should return zero when no cards have been created", func(t *testing.T) {
		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.Zero(t, count)
	})

	t.Run("should correctly return the cards of all boards", func(t *testing.T) {
		// two boards
		board1 := &model.Board{
			ID:     board1ID,
			TeamID: testTeamID,
			Type:   model.BoardTypeOpen,
		}
		_, err := store.InsertBoard(board1, userID)
		require.NoError(t, err)

		board2 := &model.Board{
			ID:     board2ID,
			TeamID: testTeamID,
			Type:   model.BoardTypePrivate,
		}
		_, err = store.InsertBoard(board2, userID)
		require.NoError(t, err)

		// board 1 has three cards
		for _, cardID := range []string{card1ID, card2ID, card3ID} {
			card := &model.Block{
				ID:       cardID,
				ParentID: board1ID,
				BoardID:  board1ID,
				Type:     model.TypeCard,
			}
			require.NoError(t, store.InsertBlock(card, userID))
		}

		// board 2 has two cards
		for _, cardID := range []string{card4ID, card5ID} {
			card := &model.Block{
				ID:       cardID,
				ParentID: board2ID,
				BoardID:  board2ID,
				Type:     model.TypeCard,
			}
			require.NoError(t, store.InsertBlock(card, userID))
		}

		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.EqualValues(t, 5, count)
	})

	t.Run("should not take into account content blocks", func(t *testing.T) {
		// we add a couple of content blocks
		text := &model.Block{
			ID:       textID,
			ParentID: card1ID,
			BoardID:  board1ID,
			Type:     model.TypeText,
		}
		require.NoError(t, store.InsertBlock(text, userID))

		view := &model.Block{
			ID:       viewID,
			ParentID: board1ID,
			BoardID:  board1ID,
			Type:     model.TypeView,
		}
		require.NoError(t, store.InsertBlock(view, userID))

		// and count should not change
		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.EqualValues(t, 5, count)
	})

	t.Run("should not take into account cards belonging to templates", func(t *testing.T) {
		// we add a template with cards
		boardTemplate := &model.Block{
			ID:      templateID,
			BoardID: templateID,
			Type:    model.TypeBoard,
			Fields: map[string]interface{}{
				"isTemplate": true,
			},
		}
		require.NoError(t, store.InsertBlock(boardTemplate, userID))

		for _, cardID := range []string{card6ID, card7ID, card8ID} {
			card := &model.Block{
				ID:       cardID,
				ParentID: templateID,
				BoardID:  templateID,
				Type:     model.TypeCard,
			}
			require.NoError(t, store.InsertBlock(card, userID))
		}

		// and count should still be the same
		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.EqualValues(t, 5, count)
	})

	t.Run("should not take into account deleted cards", func(t *testing.T) {
		// we create a ninth card on the first board with DeleteAt set
		card9 := &model.Block{
			ID:       card9ID,
			ParentID: board1ID,
			BoardID:  board1ID,
			Type:     model.TypeCard,
			DeleteAt: utils.GetMillis(),
		}
		require.NoError(t, store.InsertBlock(card9, userID))

		// card9 has DeleteAt set so it should not be counted; total stays at 5
		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.EqualValues(t, 5, count)
	})

	t.Run("should not take into account cards from deleted boards", func(t *testing.T) {
		require.NoError(t, store.DeleteBoard(board2ID, userID))

		// After deleting board2 (card4, card5 excluded) and with card9 already excluded
		// (DeleteAt != 0), only board1's 3 non-deleted cards remain.
		count, err := store.GetUsedCardsCount()
		require.NoError(t, err)
		require.EqualValues(t, 3, count)
	})
}
