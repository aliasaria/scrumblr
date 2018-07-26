import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import RIEStatefulBase from './RIEStatefulBase';

class RIETag extends React.Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
		text: PropTypes.string.isRequired,
        removeHandler: PropTypes.func,
        className: PropTypes.string
    };

    remove = () => {
        this.props.removeHandler(this.props.text);
    };

    render = () => {
        return  <div
			className={this.props.className}
			style={{cursor: 'default'}}
        >
            {this.props.text}
            <div
                onClick={this.remove}
				className={this.props.className ? `${this.props.className}-remove` : ''}
				style={{margin: '3px', cursor: 'pointer'}}
            > × </div>
        </div>;
    };
}

export default class RIETags extends RIEStatefulBase {
    constructor(props) {
		super(props);

		this.state = {
			currentText: '',
			blurTimer: null,
		};
    }

    static propTypes = {
        value: PropTypes.array.isRequired,
        maxTags: PropTypes.number,
        minTags: PropTypes.number,
        separator: PropTypes.string,
        elementClass: PropTypes.string,
        blurDelay: PropTypes.number,
        placeholder: PropTypes.string,
        wrapper: PropTypes.string,
        wrapperClass: PropTypes.string,
        wrapperEditing: PropTypes.string,
	};

	static defaultProps = {
		...RIEStatefulBase.defaultProps,
		defaultValue: ['default'],
		minTags: 1,
	};

    addTag = (tag) => {
        if(this.doValidations(tag) && this.props.value.length < (this.props.maxTags || 65535)) {
			const value = [...this.props.value, tag];
            this.commit([...(new Set(value))]);
        }
    };

    removeTag = (tag) => {
		clearTimeout(this.state.blurTimer);

		const value = [...this.props.value];
		value.splice(value.indexOf(tag), 1);

		if(value.length < this.props.minTags - 1) {
			if(typeof this.defaultValue === 'function')
				this.commit(this.defaultValue(value));
			else if(this.props.defaultValue instanceof Array) {
				let valueIndex = (value.length - 1 >= 0 ? value.length - 1 : 0);

				while(value.length < this.props.minTags - 1) {
					if(valueIndex >= this.props.defaultValue.length)
						valueIndex = 0;

					value.push(this.props.defaultValue[valueIndex]);
					valueIndex++;
				}

				this.commit(value);
			}
			else {
				value.push(this.props.defaultValue);
				this.commit(value);
			}
		}
		else
			this.commit(value);
    };

    componentWillReceiveProps = (nextProps) => {
        if('value' in nextProps)
			this.setState({loading: false, invalid: false});
    };

    keyDown = (event) => {
        if(event.keyCode === 8) { // Backspace
            if(event.target.value.length == 0){
                const tagToRemove = this.props.value[this.props.value.length - 1];
                this.removeTag(tagToRemove);
            }

        } else if(event.keyCode === 13) { // Enter
            event.preventDefault();
            if(event.target.value.length === 0) {
                this.cancelEditing();
            } else {
                this.addTag(event.target.value);
                event.target.value = "";
            }
        } else if(event.keyCode === 27) { // Escape
            this.cancelEditing();
        }
    };

    cancelEditingDelayed = () => {
        this.setState({blurTimer: setTimeout(this.cancelEditing, (this.props.blurDelay || 180))})
    };

    cancelEditing = () => {
        this.setState({editing: false, invalid: false});
    };

    componentDidUpdate = (prevProps, prevState) => {
        const inputElem = ReactDOM.findDOMNode(this.refs.input);
        if(this.state.editing)
            inputElem.focus();
    };

    renderNormalComponent = () => {
		const editingHandlers = !this.props.shouldStartEditOnDoubleClick ? {
            onFocus: this.startEditing,
        } : {
            onDoubleClick: this.startEditing,
		};

        if(this.props.wrapper) {
            let tags = this.props.value.map((value, index) => {
                const wrapper = React.createElement(this.props.wrapper, {
                    key: index,
                    children: [value],
                    className: this.props.wrapperClass,
                });

                return wrapper;
			});

            return <span
                tabIndex="0"
                className={this.makeClassString()}
                {...editingHandlers}
                {...this.props.defaultProps}
            >{
                tags.reduce((result, el, index, arr) => {
                    result.push(el);

                    if(index < arr.length - 1)
                        result.push(this.props.separator || ', ');

                    return result;
                }, [])
            }</span>;
        }
        else {
            let tags = this.props.value.join(this.props.separator || ', ');

            return <span
                tabIndex="0"
                className={this.makeClassString()}
                {...editingHandlers}
                {...this.props.defaultProps}>
                {tags}
            </span>;
        }
    };

    makeTagElement = (text, index) => {
        return <RIETag className={this.props.wrapperEditing} key={index} text={text} removeHandler={this.removeTag} />;
    };

    renderEditingComponent = () => {
        let elements = this.props.value.map(this.makeTagElement);
        return <div tabIndex="1" onClick={this.startEditing} className={this.makeClassString()} {...this.props.editProps}>
            {elements}
            <input
                onBlur={this.cancelEditingDelayed}
                onKeyDown={this.keyDown}
                placeholder={(this.props.placeholder || "New tag")}
                ref="input" />
        </div>;
    };
}
