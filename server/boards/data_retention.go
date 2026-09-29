// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
package boards

import (
	"time"
)

func (b *BoardsApp) RunDataRetention(nowTime, batchSize int64) (int64, error) {
	b.logger.Debug("Boards RunDataRetention")
	if b.server.Config().EnableDataRetention {
		boardsRetentionDays := b.server.Config().DataRetentionDays
		endTimeBoards := convertDaysToCutoff(boardsRetentionDays, time.Unix(nowTime/1000, 0))
		return b.server.Store().RunDataRetention(endTimeBoards, batchSize)
	}
	return 0, nil
}

func convertDaysToCutoff(days int, now time.Time) int64 {
	upToStartOfDay := now.AddDate(0, 0, -days)
	cutoffDate := time.Date(upToStartOfDay.Year(), upToStartOfDay.Month(), upToStartOfDay.Day(), 0, 0, 0, 0, time.Local)
	return cutoffDate.UnixNano() / int64(time.Millisecond)
}
