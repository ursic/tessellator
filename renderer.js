var floorSize = 1000;

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

scene.add(camera);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var geom = new THREE.Geometry();

var f_index = 0;
var m_points = [];
var f_vertices = [];
var f_faces = [];
var n_faces = [];

function add_vertex(v)
{
    f_vertices.push(v);
    geom.vertices.push(v);
    return f_index++;
}

function add_face(f) {
    f_faces.push(f);
    geom.faces.push(new THREE.Face3(f.lv, f.rv, f.tv));
}

function add_face(f) {
    f_faces.push(f);
    geom.faces.push(new THREE.Face3(f.lv, f.rv, f.tv));
}

function get_middle_point(p1, p2) {
    var first_is_smaller, smaller_index,
        greater_index, key, k, v1, v2, i;
    first_is_smaller = p1 < p2;
    smaller_index = first_is_smaller ? p1 : p2;
    greater_index = first_is_smaller ? p2 : p1;
    key = (smaller_index << 32) + greater_index;

    for (k in m_points) {
        if (key === m_points[k]) {return key;}
    }

    v1 = f_vertices[p1];
    v2 = f_vertices[p2];

    i = add_vertex(new THREE.Vector3((v1.x + v2.x) / 2,
                                     0,
                                     (v1.z + v2.z) / 2));

    m_points.push({key: key, pos: i});

    return i;
}

function remove_face(f)
{
    f_faces = _.without(f_faces, f);
}

function split(f_index, origin) {
    var f = f_faces[f_index];
    var faces = [];
    var n_faces = [];
    var tn0, tn1, lcn, rcn;
    
    faces = split_once(f);

    tn0 = faces[0];
    tn0 = faces[0];

    n_faces = faces;

    if (origin) {
        if (f.lcn && f.lcn === origin) {
            lcn = [];
            lcn = split_once(faces[0]);
            faces = [faces[1]];
            f_faces = f_faces.concat(lcn);
            n_faces = JSON.parse(JSON.stringify(lcn));
            n_faces.push(faces[1]);
        }

        if(f.rcn && f.rcn == origin) {
            rcn = [];
            rcn = split_once(faces[1]);
            faces = [faces[0]];
            f_faces = f_faces.concat(lcn);
            n_faces = JSON.parse(JSON.stringify(rcn));
            n_faces.push(faces[0]);
        }
    }

    remove_face(f);
    f_faces = f_faces.concat(faces);
    neighbors[f_index] = n_faces;

    if (f.hypn && (f.hypn != origin)) {
        split(f.hypn, f);
    }

    return faces;
}

var v0 = add_vertex(new THREE.Vector3(-floorSize / 2, 0, -floorSize / 2));
var v1 = add_vertex(new THREE.Vector3(0, 0, -floorSize / 2));
var v2 = add_vertex(new THREE.Vector3(floorSize / 2, 0, -floorSize / 2));

var v3 = add_vertex(new THREE.Vector3(-floorSize / 2, 0, 0));
var v4 = add_vertex(new THREE.Vector3(0, 0, 0));
var v5 = add_vertex(new THREE.Vector3(floorSize / 2, 0, 0));

var v6 = add_vertex(new THREE.Vector3(-floorSize / 2, 0, floorSize / 2));
var v7 = add_vertex(new THREE.Vector3(0, 0, floorSize / 2));
var v8 = add_vertex(new THREE.Vector3(floorSize / 2, 0, floorSize / 2));

var t0 = {lv: v3, rv: v1, tv: v0};
var t1 = {lv: v1, rv: v3, tv: v4};

var t2 = {lv: v4, rv: v2, tv: v1};
var t3 = {lv: v2, rv: v4, tv: v5};

var t4 = {lv: v6, rv: v4, tv: v3};
var t5 = {lv: v4, rv: v6, tv: v7};

var t6 = {lv: v7, rv: v5, tv: v4};
var t7 = {lv: v5, rv: v7, tv: v8};

// Neighbors and their relative sizes.
t0.lcn = null; t0.rcn = null; t0.hypn = t1;
t0.name = "t0";

t1.lcn = t2; t1.rcn = t4; t1.hypn = t0;
t1.name = "t1";

t2.lcn = t1; t2.rcn = null; t2.hypn = t3;
t2.name = "t2";

t3.lcn = null; t3.rcn = t6; t3.hypn = t2;
t3.name = "t3";

t4.lcn = null; t4.rcn = t1; t4.hypn = t5;
t4.name = "t4";

t5.lcn = t6; t5.rcn = null; t5.hypn = t4;
t5.name = "t5";

t6.lcn = t5; t6.rcn = t3; t6.hypn = t7;
t6.name = "t6";

t7.lcn = null; t7.rcn = null; t7.hypn = t6;
t7.name = "t7";

add_face(t0);
add_face(t1);
add_face(t2);
add_face(t3);
add_face(t4);
add_face(t5);
add_face(t6);
add_face(t7);

console.log("x ", t0);

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

for (k in geom.vertices) {
    f_vertices.push(geom.vertices[k]);
}

reset_camera_rotation();
reset_camera_translation();

var render = function() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
};

render();