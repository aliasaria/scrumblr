import React from 'react';
import ReactDOM from 'react-dom';
import RIEStatefulBase from './RIEStatefulBase';

export default class RIETextArea extends RIEStatefulBase {
    keyDown = (event) => {
        if (event.keyCode === 13) { this.finishEditing() }
        if (event.keyCode === 27) { this.cancelEditing() }     // Escape
    };

    renderEditingComponent = () => {
        return <textarea
            rows={this.props.rows}
            cols={this.props.cols}
            disabled={this.state.loading}
            className={this.makeClassString()}
            defaultValue={this.props.value}
            onInput={this.textChanged}
            onBlur={this.finishEditing}
            ref="input"
            onKeyDown={this.keyDown}
            {...this.props.editProps} />;
    };

    renderNormalComponent = () => {
        const value = this.state.newValue || this.props.value || this.getValue();
        const contents = [];

        const lines = value.split('\n');
        lines.map((line, index) => {
            contents.push(line);

            if (index < lines.length - 1)
                contents.push(<br key={index} />);
        });
        let editingHandlers
        if (!this.props.disabled) {
            editingHandlers = !this.props.shouldStartEditOnDoubleClick ? {
                onFocus: this.startEditing,
                onClick: this.startEditing,
            } : {
                    onDoubleClick: this.startEditing,
                };
        }

        return (
            <span
                tabIndex="0"
                className={this.makeClassString()}
                {...editingHandlers}
                {...this.props.defaultProps}
            >
                {contents}
            </span>
        );
    };
}
