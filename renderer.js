var floorSize = 1000;

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

scene.add(camera);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var geom = new THREE.Geometry();

var v0 = new THREE.Vector3(-floorSize / 2, 0, -floorSize / 2);
var v1 = new THREE.Vector3(0, 0, -floorSize / 2);
var v2 = new THREE.Vector3(floorSize / 2, 0, -floorSize / 2);

var v3 = new THREE.Vector3(-floorSize / 2, 0, 0);
var v4 = new THREE.Vector3(0, 0, 0);
var v5 = new THREE.Vector3(floorSize / 2, 0, 0);

var v6 = new THREE.Vector3(-floorSize / 2, 0, floorSize / 2);
var v7 = new THREE.Vector3(0, 0, floorSize / 2);
var v8 = new THREE.Vector3(floorSize / 2, 0, floorSize / 2);

geom.vertices.push(v0);
geom.vertices.push(v1);
geom.vertices.push(v2);

geom.vertices.push(v3);
geom.vertices.push(v4);
geom.vertices.push(v5);

geom.vertices.push(v6);
geom.vertices.push(v7);
geom.vertices.push(v8);

console.log(geom.vertices);

// geom.faces.push(new THREE.Face3(0, 1, 2));

geom.faces.push(new THREE.Face3(3, 1, 0)); // T0
geom.faces.push(new THREE.Face3(1, 3, 4)); // T1

geom.faces.push(new THREE.Face3(4, 2, 1)); // T2
geom.faces.push(new THREE.Face3(2, 4, 5)); // T3

geom.faces.push(new THREE.Face3(6, 4, 3)); // T4
geom.faces.push(new THREE.Face3(4, 6, 7)); // T5

geom.faces.push(new THREE.Face3(7, 5, 4)); // T6
geom.faces.push(new THREE.Face3(5, 7, 8)); // T7

geom.computeFaceNormals();

var mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 'black'}));
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
                 KEY_t: 84};

var render = function() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
};

render();

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

var rotation_commands = {KEY_UP: {axis: 'x', step: 0.02},
                         KEY_DOWN: {axis: 'x', step: -0.02},
                         KEY_LEFT: {axis: 'y', step: 0.02},
                         KEY_RIGHT: {axis: 'y', step: -0.02},
                         KEY_PGUP: {axis: 'z', step: 0.02},
                         KEY_PGDOWN: {axis: 'z', step: -0.02}};

var translation_commands = {KEY_a: {axis: 'x', step: 14},
                            KEY_d: {axis: 'x', step: -14},
                            KEY_w: {axis: 'y', step: 14},
                            KEY_s: {axis: 'y', step: -14},
                            KEY_e: {axis: 'z', step: 14},
                            KEY_q: {axis: 'z', step: -14}};

reset_camera_rotation();
reset_camera_translation();

document.addEventListener
('keydown', function(e)
 {
     var which;
     if (_.invert(key_codes)[e.keyCode]) {
         which = rotation_commands[_.invert(key_codes)[e.keyCode]];
         if (which) {
             rotate_camera(which.axis, which.step);
             return;
         }

         which = translation_commands[_.invert(key_codes)[e.keyCode]];

         if (which) {
             translate_camera(which.axis, which.step);
         }
     }

     if (e.keyCode == key_codes.KEY_NUM_5) {
         reset_camera_rotation();
     }

     if (e.keyCode == key_codes.KEY_NUM_STAR) {
         reset_camera_translation();
     }

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
 });