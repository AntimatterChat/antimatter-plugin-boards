// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// The tests build their mock stores with redux-mock-store (on redux 4) and redux-thunk's middleware, which only fit
// once redux's Dispatch knows thunks. mattermost-redux's action types extend it (they import
// 'redux-thunk/extend-redux', on that same redux 4). The plugin used to load them by chance, through its import of
// mattermost-redux's team actions, which the side panel no longer needs: load them on purpose.
import 'mattermost-redux/types/actions'
