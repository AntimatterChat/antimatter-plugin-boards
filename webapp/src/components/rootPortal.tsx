// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React, {useState, useLayoutEffect} from 'react'
import ReactDOM from 'react-dom'

import {kanbanLayer} from './fusion/layer'

type Props = {
    children: React.ReactNode
}

const RootPortal = (props: Props): React.JSX.Element => {
    const [el] = useState(document.createElement('div'))

    useLayoutEffect(() => {
        // Looked up once mounted: in the side panel, the portal's box is drawn with the views that use it. Under the
        // Fusion UI, it's Kanban's box in Fusion's layer, above the app.
        const rootPortal = kanbanLayer() || document.getElementById('focalboard-root-portal')
        if (rootPortal) {
            rootPortal.appendChild(el)
        }
        return () => {
            if (rootPortal) {
                rootPortal.removeChild(el)
            }
        }
    }, [])

    return ReactDOM.createPortal(props.children, el)  // eslint-disable-line
}

export default React.memo(RootPortal)
