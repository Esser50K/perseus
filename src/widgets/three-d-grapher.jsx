/* eslint-disable */
var React = require("react");
var _ = require("underscore");


var ApiOptions = require("../perseus-api.jsx").Options;
var Changeable   = require("../mixins/changeable.jsx");
var EditorJsonify = require("../mixins/editor-jsonify.jsx");
var Editor = require("../editor.jsx");
var Renderer = require("../renderer.jsx");
var MathInput = require("../components/math-input.jsx");
var ApiClassNames = require("../perseus-api.jsx").ClassNames;
var InputWithExamples = require("../components/input-with-examples.jsx");
var ColorPicker = require("./interaction/color-picker.jsx");

var ThreeDGrapher = React.createClass({
    mixins: [Changeable],

    getDefaultProps: function() {
        return {
            surfacesData: [],//Populated based on editor
            rotationRate: 0.001,
            cameraConfig: {
                fov : 10,
                near : 1,
                far : 500,
                x : -10, 
                y : 20,
                z : 50,
            },
            lightConfig: {
                ambientLightColor : 0x999999,
                lightSourceColor : 0xaaaaaa,
                lightSourceIntensity : 0.5,
                lightSourcePositions : [
                    [-1, 2, 1],
                    [-1, -2, 1],
                ],
            },
            controlsConfig: {
                enableDamping : true,
                dampingFactor : 1.0,
                enableZoom : false,
            },
            graphConfig: {
                uSegments: 100,
                vSegments: 100,
                materialConfig: {
                    specular: 0x009900,
                    shininess: 5,
                    shading: THREE.SmoothShading, 
                    side: THREE.DoubleSide,
                    transparent : true,
                    opacity : 1,
                },
            },
            axesConfig: {
                axisRadius : 5,
                step : 1,
                tickSize : 0.1,
                axesMaterialConfig : {
                    color : 0xdddddd,
                    linewidth: 2,
                },
                planeMaterialConfig : {
                    color: 0x303030,
                    linewidth : 1,
                },
            },
        };
    },

    initializeThreeState: function(){
        //TODO, automatic width and height changes
        var width = 600;
        var height = 400;
        var aspectRatio = width/height;

        var renderer = this.getRenderer(width, height);
        var camera = this.getCamera(aspectRatio);
        var controls = this.getControls(camera, renderer.domElement); 
        var scene = this.getScene();

        this.setState({
            renderer,
            camera,
            controls,
            scene
        });
    },

    getScene: function(){
        var scene = new THREE.Scene();
        this.addLight(scene);
        var numSurfaces = this.props.surfacesData.length
        for(var i = 0; i < numSurfaces; i++){
            try{
                scene.add(this.getGraphMesh(i));
            }catch(err){
                //TODO
                console.log(err)
            }
        }    
        scene.add(this.getXZPlane());        
        scene.add(this.getAxes());
        return scene;
    },

    getCamera: function(aspectRatio){
        var config = this.props.cameraConfig;
        var camera = new THREE.PerspectiveCamera(
            config.fov, aspectRatio, 
            config.near, config.far
        );
        camera.position.set(config.x, config.y, config.z);
        return camera;
    },

    getRenderer: function(width, height){
        var renderer = new THREE.WebGLRenderer();        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        this.refs.container.appendChild(renderer.domElement);
        return renderer;
    },

    addLight: function(scene){
        var config = this.props.lightConfig;

        scene.add(new THREE.AmbientLight(config.ambientLightColor));
        config.lightSourcePositions.forEach(function(position){
            var light = new THREE.DirectionalLight(
                config.lightSourceColor, 
                config.lightSourceIntensity
            );
            var [x, y, z] = position;
            light.position.set(x, y, z);
            scene.add(light);
        });
    },

    getControls: function(camera, domElement){
        var config = this.props.controlsConfig;
        var controls = new THREE.OrbitControls(camera, domElement);
        controls.enableZoom = config.enableZoom
        controls.dampingFactor = config.dampingFactor
        controls.enableDamping = config.enableDamping
        return controls
    },

    getSurfaceFunction: function(index){
        var data = this.props.surfacesData[index];
        var bounds = {};
        for (key in data.bounds){
            var parsed = KAS.parse(data.bounds[key]);
            bounds[key] = parsed.expr.eval();
        }
        var u_range = bounds.u_max - bounds.u_min;
        var v_range = bounds.v_max - bounds.v_min;
            
        expressions = {};
        for (let variable in data.functionStrings){
            var funcString = data.functionStrings[variable];
            expr = KAS.parse(funcString).expr
            expressions[variable] = expr
        }
        return function(u, v){
            var scaled_u = u_range*u + bounds.u_min;
            var scaled_v = v_range*v + bounds.v_min;
            //return in order x, z, y to accomidate
            //orbital controls
            return new THREE.Vector3(
                expressions.x.eval({u: scaled_u, v: scaled_v}),
                expressions.z.eval({u: scaled_u, v: scaled_v}),
                expressions.y.eval({u: scaled_u, v: scaled_v})                 
            );
        };
    },

    getGraphMesh: function(index){
        var data = this.props.surfacesData[index];
        var config = this.props.graphConfig;
        var geometry = new THREE.ParametricGeometry(
            this.getSurfaceFunction(index),
            config.uSegments, config.vSegments
        )
        var material = new THREE.MeshPhongMaterial({
            ...config.materialConfig,
            "color" : data.color
        });
        return new THREE.Mesh(geometry, material);
    },

    getAxes: function(){
        var config = this.props.axesConfig;
        var min = -config.axisRadius;
        var max = config.axisRadius;
        var material = new THREE.LineBasicMaterial(
            config.axesMaterialConfig
        );
        var xAxisGeometry = new THREE.Geometry();
        xAxisGeometry.vertices.push(
            new THREE.Vector3(min, 0, 0),
            new THREE.Vector3(max, 0, 0)
        );

        for (var i = min; i <= max; i += config.step){
            xAxisGeometry.vertices.push(
                new THREE.Vector3(i, -config.tickSize, 0),
                new THREE.Vector3(i, config.tickSize, 0)
            );
        }
        xAxis = new THREE.LineSegments(xAxisGeometry, material);

        var yAxis = xAxis.clone();
        yAxis.rotation.set(0, 0, Math.PI/2);
        var zAxis = xAxis.clone();
        zAxis.rotation.set(0, Math.PI/2, 0);

        var group = new THREE.Object3D();
        group.add(xAxis, yAxis, zAxis);

        return group;
    },

    getXZPlane: function() {
        var config = this.props.axesConfig;
        var min = -config.axisRadius;
        var max = config.axisRadius
        /* Draw xz plane  instead of xy plane 
        to accomiate orbital controls. */
        var material = new THREE.LineBasicMaterial(
            config.planeMaterialConfig
        );
        var  xz_plane = new THREE.Geometry();
        for (var i = min; i <= max; i += config.step){
            xz_plane.vertices.push(
                new THREE.Vector3(min, 0, i),
                new THREE.Vector3(max, 0, i)
            );
            xz_plane.vertices.push(
                new THREE.Vector3(i, 0, min),
                new THREE.Vector3(i, 0, max)
            );
        }
        return new THREE.LineSegments(xz_plane, material);
    },

    updateThreeJS: function() {
        // queue the next update
        requestAnimationFrame(() => this.updateThreeJS());

        if (this.state) {
            const {controls, renderer, scene, camera} = this.state;
            var rotationRate = this.props.rotationRate;
            scene.children.forEach(function(child){
                child.rotation.y += rotationRate;
            });
            controls.update();
            renderer.render(scene, camera);
        }
    },

    componentDidMount: function() {
        this.forceUpdate();
        this.initializeThreeState();
        this.updateThreeJS();
    },

    componentWillReceiveProps: function(){
        //Redraw graph when receiving new props
        this.setState({
            scene: this.getScene()
        });
    },

    render: function() {
        return <div
            className="perseus-3d-grapher" 
            ref="container"
         />; //
    },
});

var EntryComponent = React.createClass({
    mixins: [Changeable, EditorJsonify],

    render: function(){
        return (
            <div>
            {this.props.prompt}
            <MathInput
                ref="input"
                className={ApiClassNames.INTERACTIVE}
                value={this.props.value}
                onChange={this.props.onChange}
                convertDotToTimes={false}
                buttonSets={["basic"]}
            />
            </div>
        );
    }
});

var SurfaceEditor = React.createClass({
    mixins: [Changeable, EditorJsonify],

    handlePropElementChange: function(propName, key, value){
        var newSurfaceData = this.props;
        newSurfaceData[propName][key] = value;
        this.props.onChange(this.props.index, newSurfaceData);
    },

    render: function() {
        var functionDataEntries = [];
        var functionProps = ["functionStrings", "bounds"];
        for(var i = 0; i < functionProps.length; i++){
            let prop = functionProps[i];
            if (prop == "functionStrings"){
                var promptSuffix = "(u, v) = ";
            }else{
                var promptSuffix = ": ";
            }
            for (let key in this.props[prop]) {
                functionDataEntries.push(
                    <EntryComponent
                        key={key}
                        prompt={key+promptSuffix}
                        value={this.props[prop][key] || ""}
                        onChange={(newString) => this.handlePropElementChange(
                            prop, key, newString
                        )}
                     />
                ); //
            }
        }

        return (
            <div className="surface-editor">
                <form>{functionDataEntries}</form>
            </div>
        );
    }

});

var ThreeDGrapherEditor = React.createClass({
    mixins: [Changeable, EditorJsonify],

    getDefaultSurfaceData: function() {
        return {
            color: KhanUtil.BLUE_D,
            functionStrings: {
                x : "u",
                y : "v",
                z : "\\sin(u)\\sin(v)"
            }, 
            bounds: {
                u_min : "-5",
                u_max : "5",
                v_min : "-5",
                v_max : "5"
            }
        };
    },

    getDefaultProps: function() {
        return {
            surfacesData: [],
        };
    },

    handleSurfaceDataChange: function(index, data){
        // var surfacesData = this.props.surfacesData;
        // surfacesData[index] = data;
        // this.props.onChange({
        //     surfacesData: surfacesData
        // });
        this.props.surfacesData[index] = data;
        this.forceUpdate();
    },

    render: function(){
        var surfaceEditors = [];
        for(var i = 0; i < 1; i++){
            if (this.props.surfacesData.length < i+1){
                this.props.surfacesData.push(
                    this.getDefaultSurfaceData()
                );
            }
            surfaceEditors.push(
                <SurfaceEditor
                    key={i}
                    index={i}
                    {...this.props.surfacesData[i]}
                    onChange={this.handleSurfaceDataChange}
                />
            );//
        }
        return (
            <div className="perseus-three-d-grapher-editor">
            {surfaceEditors}
            </div>
        ); //
    },
});


module.exports = {
    name: "three-d-grapher",
    displayName: "Three-dimensional grapher",
    widget: ThreeDGrapher,
    editor: ThreeDGrapherEditor,
    hidden: false,
};

