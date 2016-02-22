var React = require("react");
var _ = require("underscore");

var ApiOptions = require("../perseus-api.jsx").Options;
var Changeable   = require("../mixins/changeable.jsx");
var Editor = require("../editor.jsx");
var Renderer = require("../renderer.jsx");

var Grapher3D = React.createClass({
    mixins: [Changeable],

    propTypes: {
        content: React.PropTypes.string,
        widgets: React.PropTypes.object,
        images: React.PropTypes.object,
        icon: React.PropTypes.object,
        reviewModeRubric: React.PropTypes.object,
    },

    getDefaultProps: function() {
        return {
            content: "",
            widgets: {},
            images: {},
            icon: null
        };
    },

    componentDidMount: function() {
        this.forceUpdate();
    },

    render: function() {
        var apiOptions = _.extend(
            {},
            ApiOptions.defaults,
            this.props.apiOptions,
            {
                // Api Rewriting to support correct onFocus/onBlur
                // events for the mobile API
                onFocusChange: (newFocus, oldFocus) => {
                    if (oldFocus) {
                        this.props.onBlur(oldFocus);
                    }
                    if (newFocus) {
                        this.props.onFocus(newFocus);
                    }
                }
            }
        );

        // Allow a problem number annotation to be added.
        // This is cyclical and should probably be reconsidered. In order to
        // render the annotation ("Question 3 of 10"), we call interWidgets to
        // figure out our index in the list of all fellow group widgets. On
        // first render, though, we don't exist yet in this list, and so we
        // give ourselves number -1. To combat this, we forceUpdate in
        // componentDidMount so that we can number ourselves properly. But,
        // really we should have a more unidirectional flow. TODO(marcia): fix.
        var number = _.indexOf(this.props.interWidgets("3d-grapher"), this);
        var problemNumComponent = this.props.apiOptions.groupAnnotator(
            number, this.props.widgetId);

        // This is a little strange because the id of the widget that actually
        // changed is going to be lost in favor of the group widget's id. The
        // widgets prop also wasn't actually changed, and this only serves to
        // alert our renderer (our parent) of the fact that some interaction
        // has occurred.
        var onInteractWithWidget = (id) => {
            if (this.refs.renderer) {
                this.change("widgets", this.refs.renderer.props.widgets);
            }
        };

        return <div className="perseus-3d-grapher">
            {problemNumComponent}
            <Renderer
                {...this.props}
                ref="renderer"
                apiOptions={apiOptions}
                interWidgets={this._interWidgets}
                reviewMode={!!this.props.reviewModeRubric}
                onInteractWithWidget={onInteractWithWidget} />
            {this.props.icon && <div className="3d-grapher-icon">
                {this.props.icon}
            </div>}
        </div>;
    },

    _interWidgets: function(filterCriterion, localResults) {
        if (localResults.length) {
            return localResults;
        } else {
            return this.props.interWidgets(filterCriterion);
        }
    },

    getUserInput: function() {
        return this.refs.renderer.getUserInput();
    },

    getSerializedState: function() {
        return this.refs.renderer.getSerializedState();
    },

    restoreSerializedState: function(state, callback) {
        this.refs.renderer.restoreSerializedState(state, callback);
        // Tell our renderer that we have no props to change
        // (all our changes were in state):
        return null;
    },

    simpleValidate: function(rubric) {
        return this.refs.renderer.score();
    },

    // Mobile API:
    getInputPaths: function() {
        return this.refs.renderer.getInputPaths();
    },

    setInputValue: function(path, newValue, cb) {
        return this.refs.renderer.setInputValue(path, newValue, cb);
    },

    getAcceptableFormatsForInputPath: function(path) {
        return this.refs.renderer.getAcceptableFormatsForInputPath(path);
    },

    /**
     * WARNING: This is an experimental/temporary API and should not be relied
     *     upon in production code. This function may change its behavior or
     *     disappear without notice.
     *
     * This function was created to allow Renderer.getAllWidgetIds to descend
     * into our renderer.
     */
    getRenderer: function() {
        return this.refs.renderer;
    },

    focus: function() {
        return this.refs.renderer.focus();
    },

    focusInputPath: function(path) {
        this.refs.renderer.focusPath(path);
    },

    blurInputPath: function(path) {
        this.refs.renderer.blurPath(path);
    }
});

var Grapher3DEditor = React.createClass({
    mixins: [Changeable],

    propTypes: {
        content: React.PropTypes.string,
        widgets: React.PropTypes.object,
        images: React.PropTypes.object,
        metadata: React.PropTypes.any,
        apiOptions: ApiOptions.propTypes,
    },

    getDefaultProps: function() {
        return {
            content: "",
            widgets: {},
            images: {},
            // `undefined` instead of `null` so that getDefaultProps works for
            // `the GroupMetadataEditor`
            metadata: undefined
        };
    },

    render: function() {
        return <div className="perseus-grapher-3d-editor">
            <div>
                {/* the metadata editor; used for tags on khanacademy.org */}
                {this._renderMetadataEditor()}
            </div>
            <Editor
                ref="editor"
                content={this.props.content}
                widgets={this.props.widgets}
                apiOptions={this.props.apiOptions}
                images={this.props.images}
                widgetEnabled={true}
                immutableWidgets={false}
                onChange={this.props.onChange} />
        </div>;
    },

    _renderMetadataEditor: function() {
        var GroupMetadataEditor = this.props.apiOptions.GroupMetadataEditor;
        return <GroupMetadataEditor
            value={this.props.metadata}
            onChange={this.change("metadata")} />;
    },

    getSaveWarnings: function() {
        return this.refs.editor.getSaveWarnings();
    },

    serialize: function() {
        return _.extend({}, this.refs.editor.serialize(), {
            metadata: this.props.metadata
        });
    },
});

var traverseChildWidgets = function(
        props,
        traverseRenderer) {

    return _.extend({}, props, traverseRenderer(props));
};

module.exports = {
    name: "grapher-three-d",
    displayName: "Grapher 3D",
    widget: Grapher3D,
    editor: Grapher3DEditor,
    traverseChildWidgets: traverseChildWidgets,
    hidden: false,
};

