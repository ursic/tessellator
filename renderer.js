var floorSize = 1000;

var scene = new THREE.Scene();
var old_mesh, new_mesh;

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
// scene.add(camera);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CONTROLS
controls = new THREE.OrbitControls(camera, renderer.domElement);

var geom;
var nt = {LEFT: 1, RIGHT: 2, HYPN: 4};
var ornt = {LEFT_TO_LEFT:    1,
            LEFT_TO_RIGHT:   2,
            RIGHT_TO_LEFT:   4,
            RIGHT_TO_RIGHT:  8,
            HYPN_TO_LEFT:   16,
            HYPN_TO_RIGHT:  32};

var f_index = 0;
var m_points = [];
var f_vertices = [];
var f_faces = [];
var neighbors = [];

function face_id() {
    return rnd_str(4).toUpperCase();
}

function rndstr() {
    return rnd_str(2, true).toUpperCase();
}

/*
 * Return face with given face ID.
 */
function get_face(id) {
    return _.find(f_faces, function(f) {return f.id === id;});
}

/*
 * Set face with given ID to given face.
 */
function set_face(id, f) {
    remove_face(id);
    f_faces.push(f);
}

function add_vertex(x, y, z)
{
    var v = new THREE.Vector3(x, y, z);
    f_vertices.push(v);
    return f_index++;
}

function set_geom() {
    geom = new THREE.Geometry();

    _.each(f_vertices, function(f_v) {geom.vertices.push(f_v);});
    _.each(f_faces, function(f) {geom.faces.push(new THREE.Face3(f.lv, f.rv, f.tv));});

    return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 'black'}));
}

function update_scene(old_mesh, new_mesh) {
    old_mesh && scene.remove(old_mesh);
    scene.add(new_mesh);
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

    i = add_vertex((v1.x + v2.x) / 2, 0, (v1.z + v2.z) / 2);

    m_points.push({key: key, pos: i});

    return i;
}

/*
 * Assign given cathetus-adjacent same-sized faces twin faces
 * (result of recently-split larger face)
 * to each other as neighbors.
 */
function assign_twins(lf, rf) {
    lf.lcn = {id: rf.id, t: nt.RIGHT};
    rf.rcn = {id: lf.id, t: nt.LEFT};
    return {lf: lf, rf: rf};
}

/*
 * Split given face f with no neighbors.
 * Assign resultant faces to each other as neighbors.
 */
function split_0n(f_id) {
    var f, sr, nr;
    f = get_face(f_id);
    if (!f) {return [];}
    sr = split_once(f);
    nr = assign_twins(sr[0], sr[1]);
    return [nr.lf, nr.rf];
}

/*
 * Assign given hypotenuse-cathetus-adjacent
 * origin face o and neighboring face n
 * to each other as neighbors
 * with orientation ornt.
 */
function assign_hcn(o, n, _ornt) {
    if (_ornt === ornt.HYPN_TO_LEFT) {
        o.hypn = {id: n.id, t: nt.LEFT};
        n.lcn  = {id: o.id, t: nt.HYPN};
    }
    if (_ornt === ornt.HYPN_TO_RIGHT) {
        o.hypn = {id: n.id, t: nt.RIGHT};
        n.rcn  = {id: o.id, t: nt.HYPN};
    }
    return {o: o, n: n};
}

/*
 * Assign given hypotenuse-hypotenuse-adjacent
 * origin face o and neighboring face n
 * to each other as neighbors.
 */
function assign_hhn(o, n) {
    o.hypn = {id: n.id, t: nt.HYPN};
    n.hypn = {id: o.id, t: nt.HYPN};
    return {o: o, n: n};
}

/*
 * Assign new cathetus or hypotenuse neighbors
 * to the newly split left (lf) and right (rf) faces.
 * Also assign the new faces as neighbors to their neighbors.
 */
function assign_hXn(f, lf, rf) {
    var nf, r;
    if (f.lcn) {
        nf = get_face(f.lcn.id);
        // Assign new left face to the cathetus neighbor(s).
        if (nt.LEFT === f.lcn.t) {
            r = assign_hcn(lf, nf, ornt.HYPN_TO_LEFT);
            lf = r.o;
            nf = r.n;
            // Store neighboring face.
            set_face(nf.id, nf);
        }
        if (nt.RIGHT === f.lcn.t) {
            r = assign_hcn(lf, nf, ornt.HYPN_TO_RIGHT);
            lf = r.o;
            nf = r.n;
            // Store neighboring face.
            set_face(nf.id, nf);
        }
    }

    if (f.rcn) {
        nf = get_face(f.rcn.id);
        // Assign new right face to the cathetus neighbor(s).
        if (nt.LEFT === f.rcn.t) {
            r = assign_hcn(rf, nf, ornt.HYPN_TO_LEFT);
            rf = r.o;
            nf = r.n;
            // Store neighboring face.
            set_face(nf.id, nf);
        }
        if (nt.RIGHT === f.rcn.t) {
            r = assign_hcn(rf, nf, ornt.HYPN_TO_RIGHT);
            rf = r.o;
            nf = r.n;
            // Store neighboring face.
            set_face(nf.id, nf);
        }
    }

    // Assign new left face to the hypotenuse neighbor(s).
    if (f.lcn && (nt.HYPN === f.lcn.t)) {
        nf = get_face(f.lcn.id);
        r = assign_hhn(lf, nf);
        lf = r.o;
        nf = r.n;
        // Store neighboring face.
        set_face(nf.id, nf);
    }

    if (f.rcn && (nt.HYPN === f.rcn.t)) {
        nf = get_face(f.rcn.id);
        r = assign_hhn(rf, nf);
        rf = r.o;
        nf = r.n;
        // Store neighboring face.
        set_face(nf.id, nf);
    }

    return {lf: lf, rf: rf};
}

/*
 * Split given face f with one or both cathetus-cathetus or
 * cathetus-hypotenuse neighbors.
 * Assign resultant faces to each other as neighbors.
 * Assign twins as the neighbor(s) to surrounding faces.
 */
function split_cXn(f_id) {
    var f, sr, twr, r;
    f = get_face(f_id);
    if (!f) {return [];}
    if (!f.lcn && !f.rcn) {
        console.log("_cXn no neighbors");
        return [];
    }

    sr = split_once(f);
    twr = assign_twins(sr[0], sr[1]);

    r = assign_hXn(f, twr.lf, twr.rf);

    return [r.lf, r.rf];
}

/*
 * Split given face f with hypotenuse-hypotenuse neighbor.
 * Assign resultant faces from f and n to each other as neighbors.
 */
function split_hhn(f_id) {
    var f, n, sr, twr, r, srn, twrn, rn;
    f = get_face(f_id);
    if (!f) {return [];}
    if (!f.hypn || (nt.HYPN !== f.hypn.t)) {
        console.log("_hhn no hypn neighbors");
        return [];
    }

    console.log("_hhn", f_id);

    sr = split_once(f);
    twr = assign_twins(sr[0], sr[1]);
    r = assign_hXn(f, twr.lf, twr.rf);

    // Hypotenuse-hypotenuse neighbor.
    n = get_face(f.hypn.id);

    srn = split_once(n);
    twrn = assign_twins(srn[0], srn[1]);
    rn = assign_hXn(n, twrn.lf, twrn.rf);

    // Assign resultant faces from f and n to each other as neighbors.
    r.lf.rcn = {id: rn.rf.id, t: nt.LEFT};
    r.rf.lcn = {id: rn.lf.id, t: nt.RIGHT};

    rn.lf.rcn = {id: r.rf.id, t: nt.LEFT};
    rn.rf.lcn = {id: r.lf.id, t: nt.RIGHT};
    
    return [r.lf, r.rf, rn.lf, rn.rf];
}

/*
 * Split face with given face ID f_id twice.
 * The second split should be on which_cath side.
 */
function split_twice(f_id, which_cath) {
    var f, sr, sr2, r = {};

    f = get_face(f_id);
    if (!f) {return {};}

    // Split main face.
    sr = split_once(f);

    // Split left face of the main face.
    if (nt.LEFT === which_cath) {
        sr2 = split_once(sr[0]);
        r = {twins: {lf: sr2[0], rf: sr2[1]}, rf: sr[1]};
    }
    // Split right face of the main face.
    if (nt.RIGHT === which_cath) {
        sr2 = split_once(sr[1]);
        r = {twins: {lf: sr2[0], rf: sr2[1]}, lf: sr[0]};
    }
    return r;
}

function split_hcn(f_id, which_cath = null, new_ns = {}, new_fs = [], old_fs = []) {
    var f, sr, twr, r, t, hcn_res, s2r;

    f = get_face(f_id);
    if (!f) {return new_fs;}

    // No hypotenuse neighbor?
    if (_.isEmpty(new_ns) && !f.hypn) {
        console.log("_hcn no hypotenuse neighbor.");
        return {new_ns: new_ns, new_fs: new_fs, old_fs: old_fs};
    }

    console.log("_hcn start");

    // Initial split.
    if (_.isEmpty(new_ns)) {
console.log("_hcn initial split");
        sr = split_once(f);
        twr = assign_twins(sr[0], sr[1]);
        r = assign_hXn(f, twr.lf, twr.rf);
        new_fs.push(twr.lf, twr.rf);
        old_fs.push(f.id);
        new_ns = {lf: {f: twr.lf, t: nt.RIGHT},
                  rf: {f: twr.rf, t: nt.LEFT}};

        // Initial split always has a further face to split.
        return split_hcn(f.hypn.id, f.hypn.t, new_ns, new_fs, old_fs);
    }

    // Further division:

    console.log("_hcn Further division:");

    console.log("_hcn type: ", which_cath);
    // console.log("_hcn new_ns: ", new_ns);
    // console.log("_hcn new_fs: ", new_fs);
    // console.log("_hcn old_fs: ", old_fs);

    sr2 = split_twice(f_id, which_cath);

    console.log("sr2 ", sr2);

    // No hypotenuse neighbor? Stop.
    if (!f.hypn) {
        console.log("_hcn No neighbor.");
        return {new_fs: new_fs, old_fs: old_fs};
    }

    // Cathetus neighbor? Split it.
    if (f.hypn && ((nt.LEFT  === f.hypn.t) ||
                   (nt.RIGHT === f.hypn.t))) {
        console.log("_hcn cathetus neighbor.");
        return split_hcn(f.hypn.id, f.hypn.t, new_ns, new_fs, old_fs);
    }

    // Hypotenuse neighbor? Split it here.
    if (f.hypn && (nt.HYPN === f.hypn.t)) {
        console.log("_hcn hypotenuse neighbor.");
        return {new_fs: new_fs, old_fs: old_fs};
    }

console.log("_hcn end.");

    return {};
}

function split_once(f) {
    var vc, tn0, tn1, area;
    vc = get_middle_point(f.lv, f.rv);

    cath_len = Math.sqrt(Math.pow(f_vertices[f.tv].x - f_vertices[vc].x, 2) +
                         Math.pow(f_vertices[f.tv].z - f_vertices[vc].z, 2),
                         2);
    tn_area = Math.round((Math.pow(cath_len, 2) / 2) / 100);

    tn0 = {lv: f.tv, rv: f.lv, tv: vc, id: face_id(), name: "tn-" + tn_area + "-" + rndstr()};
    tn1 = {lv: f.rv, rv: f.tv, tv: vc, id: face_id(), name: "tn-" + tn_area + "-" + rndstr()};

    return [tn0, tn1];
}

function remove_face(f_id) {
    f_faces = _.without(f_faces, get_face(f_id));
}

// function split(f, origin) {
//     var fc_index;
//     var faces = [];
//     var n_faces = [];
//     var found = false;
//     var tn0, tn1, lcn, rcn;

//     // Find index of given face.
//     for (fc_index in f_faces) {
//         if (f_faces[fc_index] === f) {
//             found = true;
//             break;
//         }
//     }

// console.log("found ", found, f.name);

//     if (!found) {return;}

//     faces = split_once(f);
//     n_faces = faces;

//     if (origin) {
//         if (f.lcn && (f.lcn === origin)) {
// console.log("split left");
//             lcn = [];
//             lcn = split_once(faces[0]);
//             faces = [faces[1]];
//             f_faces = f_faces.concat(lcn);
//             n_faces = JSON.parse(JSON.stringify(lcn));
//             n_faces.push(faces[1]);
//         }
//         if (f.rcn && (f.rcn === origin)) {
// console.log("split right");
//             rcn = [];
//             rcn = split_once(faces[1]);
//             faces = [faces[0]];
//             f_faces = f_faces.concat(lcn);
//             n_faces = JSON.parse(JSON.stringify(rcn));
//             n_faces.push(faces[0]);
//         }
//     }

// console.log("remove ", f.name);

//     remove_face(f);
//     f_faces = f_faces.concat(faces);
//     neighbors[fc_index] = n_faces;

//     if (f.hypn && (f.hypn != origin)) {
// console.log("f.hypn ", f.hypn.name);
// console.log("f ", f.name);
//         split(f.hypn, f);
//     }
// }

/*
 * Obtain face from given face ID f_id.
 * Look at the face's neighbors.
 * Call the appropriate split function.
 */
function split(f_id) {
    var f, r;

    f = get_face(f_id);

    if (!f.lcn && !f.rcn && !f.hypn) {
        console.log("split_0n");
        r = split_0n(f_id);
        remove_face(f_id);
        f_faces = f_faces.concat(r);
    }
    
    if ((f.lcn || f.rcn) && !f.hypn) {
        console.log("split_cXn");
        r = split_cXn(f_id);
        remove_face(f_id);
        f_faces = f_faces.concat(r);
    }

    if (f.hypn && (nt.HYPN === f.hypn.t)) {
        console.log("split_hhn");
        r = split_hhn(f_id);
        remove_face(f_id);
        remove_face(f.hypn.id);
        f_faces = f_faces.concat(r);
    }

    if (f.hypn && ((nt.LEFT === f.hypn.t) ||
                   (nt.RIGHT === f.hypn.t))) {
        console.log("split_hcn");
        r = split_hcn(f_id);

        console.log("split_hcn result: ", r);
    }

    console.log("end");
}

function split_by_name(name) {
    var f = _.find(f_faces, function(_f) {return _f.name === name;});
    split(f);
    assign_neighbors(neighbors);
    old_mesh = new_mesh;
    new_mesh = set_geom();
    update_scene(old_mesh, new_mesh);
}

function assign_neighbors(n_faces) {
    var origin, origin_face, tn0, tn1, i,
        first, second, first_face, second_face, tn2, tn3,
        tg0, tg1, tg2, tg3, tnX;

    if (!n_faces) {return;}

    if (n_faces.length <= 0) {
        console.log("No neighboring candidates.");
        return;
    }

    // 2/0 - no hypotenuse neighbor
    if (1 === n_faces.length) {
console.log("2/0 - no hypotenuse neighbor");
        origin = _.keys(n_faces)[0];
        origin_face = f_faces[origin];

console.log("origin ", origin_face.name);

        tn0 = n_faces[origin][0];
        tn1 = n_faces[origin][1];

        // Assign new neighbors to surrounding faces.
        // Left cathetus neighbor.
        if (origin_face.lcn) {
            console.log("Left cathetus neighbor.");

            if (origin_face.lcn.lcn === origin_face) {
console.log("left one ", origin_face.lcn.lcn.name);
console.log("tn0 ", tn0.name);
                origin_face.lcn.lcn = tn0;
            }

            if (origin_face.lcn.rcn === origin_face) {
                origin_face.lcn.rcn = tn0;
            }

            tn0.hypn = origin_face.lcn;
        }

        // Right cathetus neighbor.
        if (origin_face.rcn) {
            console.log("Right cathetus neighbor.");

            if (origin_face.rcn.lcn === origin_face)
                origin_face.rcn.lcn = tn1;

            if (origin_face.rcn.rcn === origin_face)
                origin_face.rcn.rcn = tn1;

            tn1.hypn = origin_face.rcn;
        }

        // Child faces are neighbors to each other.
        tn0.lcn = tn1;
        tn1.rcn = tn0;
    }

    for (i = 0; i < n_faces.length; i += 1) {
        first = _.keys(n_faces)[i];
        if ((i + 1) < n_faces.length) {
            second = _.keys(n_faces)[i + 1];
        } else {
            break;
        }

        // Each original face splits into two children.
        if ((first && second) &&
            ((2 === n_faces[first].length) && (2 === n_faces[second].length)))
        {
            console.log("2/2 i: ", i);

           tn0 = n_faces[first][0];
           tn1 = n_faces[first][1];

           tn2 = n_faces[second][0];
           tn3 = n_faces[second][1];

            first_face = f_faces[first];
            second_face = f_faces[second];

            // Assign new neighbors to surrounding faces.
            // Left cathetus neighbor of the first face.
            if (first_face.lcn)
            {
                if (first_face.lcn.lcn === first_face)
                    first_face.lcn.lcn = tn0;

                if (first_face.lcn.rcn === first_face)
                    first_face.lcn.rcn = tn0;
                
                tn0.hypn = first_face.lcn;
            }

            // Right cathetus neighbor of the first face.
            if (first_face.rcn)
            {
                if (first_face.rcn.lcn === first_face)
                    first_face.rcn.lcn = tn1;

                if (first_face.rcn.rcn === first_face)
                    first_face.rcn.rcn = tn1;
                
                tn1.hypn = first_face.rcn;
            }

            // Child faces are neighbors to each other.
            tn0.lcn = tn1;
            tn0.rcn = tn3;

            tn1.lcn = tn2;
            tn1.rcn = tn0;
            
            tn2.lcn = tn3;
            tn2.rcn = tn1;

            tn3.lcn = tn0;
            tn3.rcn = tn2;

            // Assign new neighbors to surrounding faces
            // if second face is the last face.
            if (i === n_faces.length - 2) {
                // Left cathetus neighbor of the second face.
                if (second_face.lcn) {
                    if (second_face.lcn.lcn === second_face)
                        second_face.lcn.lcn = tn2;

                    if (second_face.lcn.rcn === second_face)
                        second_face.lcn.rcn = tn2;

                    if (second_face.lcn.hypn === second_face)
                        second_face.lcn.hypn = tn2;
                
                    tn2.hypn = second_face.lcn;
                }

                // Right cathetus neighbor of the second face.
                if (second_face.rcn) {
                    if (second_face.rcn.lcn === second_face)
                        second_face.rcn.lcn = tn3;

                    if (second_face.rcn.rcn === second_face)
                        second_face.rcn.rcn = tn3;

                    if (second_face.rcn.hypn === second_face)
                        second_face.rcn.hypn = tn3;
                
                    tn3.hypn = second_face.rcn;
                }
            }
        }

        // First original face splits into two children.
        // Second original face splits into three children.
        if ((first && second) &&
            ((2 === n_faces[first].length) && (3 === n_faces[second].length))) {
            console.log("2/3 i: ", i);

            tg0 = n_faces[first][0];
            tg1 = n_faces[first][1];

            tg2 = n_faces[second][0];
            tg3 = n_faces[second][1];

            tnX = n_faces[second][2];
            
            // Assign new neighbors to surrounding faces.
            // Left cathetus neighbor of the first face.
            if (first_face.lcn) {
                if (first_face.lcn.lcn === first_face)
                    first_face.lcn.lcn = tg0;

                if (first_face.lcn.rcn === first_face)
                    first_face.lcn.rcn = tg0;
                
                tg0.hypn = first_face.lcn;
            }

            // Right cathetus neighbor of the first face.
            if (first_face.rcn) {
                if (first_face.rcn.lcn === first_face)
                    first_face.rcn.lcn = tg1;

                if (first_face.rcn.rcn === first_face)
                    first_face.rcn.rcn = tg1;
                
                tg1.hypn = first_face.rcn;
            }

            // Find out which cathetus of the second face is neighbouring
            // the first face.
            if (second_face.lcn && (first === second_face.lcn)) {
                console.log("the left cathetus");

                tg0.lcn = tg1;
                tg0.rcn = tg3;

                tg1.lcn = tg2;
                tg1.rcn = tg0;

                tg2.lcn = tg3;
                tg2.rcn = tg1;
                tg2.hypn = tnX;

                tg3.lcn = tg0;
                tg3.rcn = tg2;

                tnX.rcn = tg2;
                tnX.hypn = second_face.rcn;

                if (second_face.rcn) {
                    if (second_face.rcn.lcn === second_face)
                        second_face.rcn.lcn = tnX;

                    if (second_face.rcn.rcn === second_face)
                        second.rcn.rcn = tnX;

                    if (second_face.rcn.hypn === second_face)
                        second_face.rcn.hypn = tnX;
                }
            }

            if (second_face.rcn && (first_face === second_face.rcn)) {
                console.log("the right cathetus");

                tg0.lcn = tg1;
                tg0.rcn = tg3;

                tg1.lcn = tg2;
                tg1.rcn = tg0;

                tg2.lcn = tg3;
                tg2.rcn = tg1;

                tg3.lcn = tg0;
                tg3.rcn = tg2;
                tg3.hypn = tnX;

                tnX.lcn = tg3;
                tnX.hypn = second_face.lcn;

                if (second_face.lcn) {
                    if (second_face.lcn.lcn === second_face)
                        second_face.lcn.lcn = tnX;

                    if (second_face.lcn.rcn === second_face)
                        second_face.lcn.rcn = tnX;

                    if (second_face.lcn.hypn === second_face)
                        second_face.lcn.hypn = tnX;
                }
            }
        }

        // First original face splits into three children.
        // Second original face splits into two children.
        if ((first && second) &&
            ((3 === n_faces[first].length) && (2 === n_faces[second].length))) {
            console.log("3/2 i: ", i);

            tg0 = n_faces[first][0];
            tg1 = n_faces[first][1];

            tn0 = n_faces[first][2];

            tn1 = n_faces[second][0];
            tn2 = n_faces[second][1];

            // Find out which side of the first face is halved.
            if (tn0.rcn && tg0 === tn0.rcn) {
                console.log("the left side is halved");

                tg1.hypn = tn2;

                tn0.lcn = tn1;

                tn1.lcn = tn2;
                tn1.rcn = tn0;

                tn2.lcn = tg1;
                tn2.rcn = tn1;
            }

            if (tn0.lcn && (tg1 === tn0.lcn)) {
                console.log("the right side is halved");

                tg0.hypn = tn1;

                tn0.rcn = tn2;

                tn1.lcn = tn2;
                tn1.rcn = tg0;
                
                tn2.lcn = tn0;
                tn2.rcn = tn1;
            }

            if (second_face.lcn) {
                if (second_face.lcn.lcn === second_face)
                    second_face.lcn.lcn = tn1;

                if (second_face.lcn.rcn === second_face)
                    second_face.lcn.rcn = tn1;

                if (second_face.lcn.hypn === second_face)
                    second_face.lcn.hypn = tn1;
                
                tn1.hypn = second_face.lcn;
            }

            if (second_face.rcn) {
                if (second_face.rcn.lcn === second_face)
                    second_face.rcn.lcn = tn2;

                if (second_face.rcn.rcn === second_face)
                    second_face.rcn.rcn = tn2;

                if (second_face.rcn.hypn === second_face)
                    second_face.rcn.hypn = tn2;
                
                tn2.hypn = second_face.rcn;
            }
        }

        // Each original face splits into three children.
        if ((first && second) &&
            ((3 === n_faces[first].length) && (3 === n_faces[second].length)))
        {
            console.log("3/3 i: ", i);

            
        }
    }

    // 2/3 NAREJENO

    // 3/2 NAREJENO

    // 3/3 NAREJENO

    neighbors = [];
}

var v0 = add_vertex(-floorSize / 2, 0, -floorSize / 2);
var v1 = add_vertex(0, 0, -floorSize / 2);
var v2 = add_vertex(floorSize / 2, 0, -floorSize / 2);
var v3 = add_vertex(-floorSize / 2, 0, 0);
var v4 = add_vertex(0, 0, 0);
var v5 = add_vertex(floorSize / 2, 0, 0);
var v6 = add_vertex(-floorSize / 2, 0, floorSize / 2);
var v7 = add_vertex(0, 0, floorSize / 2);
var v8 = add_vertex(floorSize / 2, 0, floorSize / 2);

var t0 = {lv: v3, rv: v1, tv: v0, id: face_id(), name: "t0"};
var t1 = {lv: v1, rv: v3, tv: v4, id: face_id(), name: "t1"};
var t2 = {lv: v4, rv: v2, tv: v1, id: face_id(), name: "t2"};
var t3 = {lv: v2, rv: v4, tv: v5, id: face_id(), name: "t3"};
var t4 = {lv: v6, rv: v4, tv: v3, id: face_id(), name: "t4"};
var t5 = {lv: v4, rv: v6, tv: v7, id: face_id(), name: "t5"};
var t6 = {lv: v7, rv: v5, tv: v4, id: face_id(), name: "t6"};
var t7 = {lv: v5, rv: v7, tv: v8, id: face_id(), name: "t7"};

// Neighbors and their relative sizes.
// t0.lcn = null; t0.rcn = null; t0.hypn = t1.id;
// t1.lcn = t2.id; t1.rcn = t4.id; t1.hypn = t0.id;
t1.lcn = {id: t2.id, t: nt.LEFT};
//t2.lcn = t1.id; t2.rcn = null; t2.hypn = t3.id;
// t2.lcn = t1.id; t2.rcn = null; t2.hypn = null;
t2.lcn = {id: t1.id, t: nt.LEFT};
t3.lcn = null; t3.rcn = t6.id; t3.hypn = t2.id;
t4.lcn = null; t4.rcn = t1.id; t4.hypn = t5.id;
t5.lcn = t6.id; t5.rcn = null; t5.hypn = t4.id;
t6.lcn = t5.id; t6.rcn = t3.id; t6.hypn = t7.id;
t7.lcn = null; t7.rcn = null; t7.hypn = t6.id;

// f_faces = [t0];
f_faces = [t1, t2];
// f_faces = [t0, t1, t2, t3, t4, t5, t6, t7];

// geom.computeFaceNormals();

new_mesh = set_geom();
update_scene(null, new_mesh);

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

function split_n(n) {
    var id, f, faces;
    if (!f_faces[n]) {console.log("split_n no faces"); return;}
    id = f_faces[n].id;
    split(id);
    old_mesh = new_mesh;
    new_mesh = set_geom();
    update_scene(old_mesh, new_mesh);
}

function split_id(f_id) {
    var id, f, faces;
    f = get_face(f_id);
    if (!f) {console.log("split_id no faces"); return;}
    split(f.id);
    old_mesh = new_mesh;
    new_mesh = set_geom();
    update_scene(old_mesh, new_mesh);
}

document.addEventListener
('keydown', function(e)
 {
     var which;
     // if (_.invert(key_codes)[e.keyCode]) {
     //     which = rotation_commands[_.invert(key_codes)[e.keyCode]];
     //     if (which) {
     //         rotate_camera(which.axis, which.step);
     //         return;
     //     }

     //     which = translation_commands[_.invert(key_codes)[e.keyCode]];
     //     if (which) {
     //         translate_camera(which.axis, which.step);
     //     }
     // }

     // if (e.keyCode === key_codes.KEY_NUM_5) {
     //     reset_camera_rotation();
     // }

     // if (e.keyCode === key_codes.KEY_NUM_STAR) {
     //     reset_camera_translation();
     // }

     if (e.keyCode === key_codes.KEY_p) {
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
     if (e.keyCode === key_codes.KEY_t) {
         camera.position.x = 0;
         camera.position.y = 1410;
         camera.position.z = 0;

         camera.rotation.x = -1.57;
         camera.rotation.y = 0;
         camera.rotation.z = 0;
     }

     if (e.keyCode === key_codes.KEY_n) {
         split_1();
     }
 });

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) 
{
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();   
}

function makeTextSprite( message, parameters )
{
	if (typeof(parameters) === undefined) parameters = {};
	
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;
	
	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
		parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

	//var spriteAlignment = parameters.hasOwnProperty("alignment") ?
	//	parameters["alignment"] : THREE.SpriteAlignment.topLeft;

	var spriteAlignment = THREE.SpriteAlignment.topLeft;

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
    
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
	
	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";

	context.lineWidth = borderThickness;
	roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	// 1.4 is extra height factor for text below baseline: g,j,p,q.
	
	// text color
	context.fillStyle = "rgba(0, 0, 0, 1.0)";

	context.fillText(message, borderThickness, fontsize + borderThickness);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial({map: texture,
                                                       useScreenCoordinates: false,
                                                       alignment: spriteAlignment});
	var sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(300, 150, 1.0);
	return sprite;	
}

var labels = [];
function label() {
    var i, spritey, a, b, c, _t;
    for (i = 0; i < geom.faces.length; i += 1) {
        spritey = makeTextSprite(" " + f_faces[i].id + " ", {fontsize: 32, backgroundColor: {r:0, g:0, b:0, a:0}});
        a = geom.vertices[geom.faces[i].a];
        c = geom.vertices[geom.faces[i].b];
        b = geom.vertices[geom.faces[i].c];

        _t = new THREE.Triangle(a, b, c);

        spritey.position = _t.midpoint().clone().multiplyScalar(1.1);
        labels.push(spritey);
    }
    _.each(labels, function(s) {scene.add(s);});
}

function remove_labels() {
    _.each(labels, function(s) {scene.remove(s);});
    labels = [];
}

// label();

// reset_camera_rotation();
reset_camera_translation();

var render = function() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
};

render();