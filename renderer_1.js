var floorSize = 1000;

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CONTROLS
controls = new THREE.OrbitControls(camera, renderer.domElement);

var geom = new THREE.Geometry();

var v0 = new THREE.Vector3(-floorSize / 2, 0, -floorSize / 2);
var v1 = new THREE.Vector3(0, 0, -floorSize / 2);
var v2 = new THREE.Vector3(floorSize / 2, 0, -floorSize / 2);
var v3 = new THREE.Vector3(-floorSize / 2, 0, 0);
// var v4 = new THREE.Vector3((-floorSize / 2) / 2, 0, (-floorSize / 2) / 2);
var v4 = new THREE.Vector3(0, 0, 0);
// var v5 = add_vertex(new THREE.Vector3(floorSize / 2, 0, 0));
// var v6 = add_vertex(new THREE.Vector3(-floorSize / 2, 0, floorSize / 2));
// var v7 = add_vertex(new THREE.Vector3(0, 0, floorSize / 2));
// var v8 = add_vertex(new THREE.Vector3(floorSize / 2, 0, floorSize / 2));

geom.vertices.push(v0);
geom.vertices.push(v1);
geom.vertices.push(v2);
geom.vertices.push(v3);
geom.vertices.push(v4);

geom.faces.push(new THREE.Face3(3, 1, 0));
// geom.faces.push(new THREE.Face3(1, 3, 4));

// var t0 = {lv: v0, rv: v3, tv: v4};
// var t1 = {lv: v1, rv: v0, tv: v4};
// var t1 = {lv: v1, rv: v3, tv: v4};

// var t2 = {lv: v4, rv: v2, tv: v1};
// var t3 = {lv: v2, rv: v4, tv: v5};

// var t4 = {lv: v6, rv: v4, tv: v3};
// var t5 = {lv: v4, rv: v6, tv: v7};

// var t6 = {lv: v7, rv: v5, tv: v4};
// var t7 = {lv: v5, rv: v7, tv: v8};

geom.computeFaceNormals();

var mesh = new THREE.Mesh(new THREE.MeshBasicMaterial({wireframe: true, color: 'black'}));
scene.add(mesh);

var key_codes = {KEY_UP: 38,
                 KEY_DOWN: 40,
                 KEY_LEFT: 37,
                 KEY_RIGHT: 39,
                 KEY_PGUP: 33,
                 KEY_PGDOWN: 34,
                 KEY_w: 87,
                 KEY_s: 83,
                 KEY_a: 65,
                 KEY_d: 68,
                 KEY_q: 81,
                 KEY_e: 69,
                 KEY_NUM_5: 101,
                 KEY_NUM_STAR: 106,
                 KEY_p: 80,
                 KEY_t: 84,
                 KEY_n: 78};

var rotation_commands = {KEY_UP:     {axis: 'x', step:  0.02},
                         KEY_DOWN:   {axis: 'x', step: -0.02},
                         KEY_LEFT:   {axis: 'y', step:  0.02},
                         KEY_RIGHT:  {axis: 'y', step: -0.02},
                         KEY_PGUP:   {axis: 'z', step:  0.02},
                         KEY_PGDOWN: {axis: 'z', step: -0.02}};

var translation_commands = {KEY_a: {axis: 'x', step:  14},
                            KEY_d: {axis: 'x', step: -14},
                            KEY_w: {axis: 'y', step:  14},
                            KEY_s: {axis: 'y', step: -14},
                            KEY_e: {axis: 'z', step:  14},
                            KEY_q: {axis: 'z', step: -14}};

function rotate_camera(axis, how_much) {
    camera.rotation[axis] += how_much;
}

function translate_camera(axis, how_much) {
    camera.position[axis] += how_much;
}

function reset_camera_rotation() {
    camera.rotation.x = -0.62;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
}

function reset_camera_translation() {
    camera.position.x = 0;
    camera.position.y = 880;
    camera.position.z = 1210;
}

document.addEventListener
('keydown', function(e)
 {
     if (e.keyCode == key_codes.KEY_p) {
         console.log("translation:");
         console.log("x: ", camera.position.x);
         console.log("y: ", camera.position.y);
         console.log("z: ", camera.position.z);
         console.log("rotation:");
         console.log("x: ", camera.rotation.x);
         console.log("y: ", camera.rotation.y);
         console.log("z: ", camera.rotation.z);
     }
     
     // Set top-down view.
     if (e.keyCode == key_codes.KEY_t) {
         camera.position.x = 0;
         camera.position.y = 1210;
         camera.position.z = 0;

         camera.rotation.x = -1.57;
         camera.rotation.y = 0;
         camera.rotation.z = 0;
     }

     if (e.keyCode == key_codes.KEY_n) {
console.log("something");

          geom = new THREE.Geometry();

geom.vertices.push(v0);
geom.vertices.push(v1);
geom.vertices.push(v2);
geom.vertices.push(v3);
geom.vertices.push(v4);

         geom.faces.push(new THREE.Face3(1, 3, 4));

scene.remove(mesh);

mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 'black'}));
scene.add(mesh);

     }
 });

reset_camera_rotation();
reset_camera_translation();

var render = function() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
};

render();
