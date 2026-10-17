// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'

import FusionIcon, {COMPASS_TO_FUSION} from '../../components/fusion/icon'
import {isFusion} from '../../components/fusion/fusion_ui'

type Props = {
    icon: string
    className?: string
}

export default function CompassIcon(props: Props): React.JSX.Element {
    // All compass icon classes start with icon,
    // so not expecting that prefix in props.
    const className = `CompassIcon icon-${props.icon}${props.className === undefined ? '' : ` ${props.className}`}`

    // Under the Fusion UI, Fusion's line icon when it has one, in the same element (which keeps its size and place);
    // the Compass glyph is hidden there (fusion_skin.scss).
    const fusion = isFusion() ? COMPASS_TO_FUSION[props.icon] : undefined
    if (fusion) {
        return (
            <i className={`${className} amfx-icon`}>
                <FusionIcon
                    name={fusion.name}
                    turn={fusion.turn}
                />
            </i>
        )
    }

    return (
        <i className={className}/>
    )
}
