// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	sq "github.com/Masterminds/squirrel"
	"github.com/antimatterchat/antimatter-plugin-boards/server/model"
)

// activeCardsQuery applies the necessary filters to the query for it
// to fetch all the active cards.
// If includeDeleted is true, the query wiil include cards from deleted boards.
func (s *SQLStore) activeCardsQuery(builder sq.StatementBuilderType, selectStr string, includeDeleted bool) sq.SelectBuilder {
	query := builder.
		Select(selectStr).
		From(s.tablePrefix + "blocks b").
		Join(s.tablePrefix + "boards bd on b.board_id=bd.id").
		Where(sq.Eq{
			"b.type":         model.TypeCard,
			"b.delete_at":    0,
			"bd.is_template": false,
		})
	if !includeDeleted {
		query = query.Where(sq.Eq{"bd.delete_at": 0})
	}

	return query
}

// getCardsCount returns the amount of cards in the server.
func (s *SQLStore) getCardsCount(db sq.BaseRunner) (int64, error) {
	row := s.activeCardsQuery(s.getQueryBuilder(db), "count(b.id)", true).
		QueryRow()

	var usedCards int64
	err := row.Scan(&usedCards)
	if err != nil {
		return 0, err
	}

	return usedCards, nil
}

// getUsedCardsCount returns the amount of active cards in the server.
func (s *SQLStore) getUsedCardsCount(db sq.BaseRunner) (int64, error) {
	row := s.activeCardsQuery(s.getQueryBuilder(db), "count(b.id)", false).
		QueryRow()

	var usedCards int64
	err := row.Scan(&usedCards)
	if err != nil {
		return 0, err
	}

	return usedCards, nil
}
