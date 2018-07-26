import React, { Component } from 'react';
import { DragSource } from 'react-dnd';

const stickerSource = {

    canDrag(props) {
        return props.canDrag
    },
    beginDrag(props) {
        return {
            color: props.color
        };
    }
};

function collect(connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging()
    };
}

class Sticker extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const { isDragging, connectDragSource } = this.props;
        const { color } = this.props
        return connectDragSource(<div className='sticker' id={`${color === 'nosticker' ? color : 'sticker-' + color}`} />)
    }
}

export default DragSource('sticker', stickerSource, collect)(Sticker);