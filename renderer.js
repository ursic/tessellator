var floorSize = 1000;

var scene = new THREE.Scene();
var old_mesh, new_mesh;

var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 4000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CONTROLS
controls = new THREE.OrbitControls(camera, renderer.domElement);

var geom;
var nt = {LEFT: 1, RIGHT: 2, HYPN: 4};

var ornt = {HYPN_TO_LEFT:  1,
            HYPN_TO_RIGHT: 2};

var m_points = [];
var f_vertices = [];
var f_faces = [];
// var history = [];
// var history_p = 0;
var neighbors = [];

function face_id() {
    return rnd_str(5).toUpperCase();
}

function vertex_id() {
    id = rnd_str(8, true).toUpperCase();
    return id.substr(0, 3) + '--' + id.substr(3);
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

function get_vertex(id) {
    return _.find(f_vertices, function(f) {return f.id === id;});
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
    var v, max, id;
    v = {x: x, y: y, z: z};
    f_vertices.push(v);
    max = _.max(f_vertices, function(v) {return v.id;}).id;
    v.id = ('undefined' === typeof(max)) ? 0 : max + 1;
    return v.id;
}

function set_geom() {
    var i;
    geom = new THREE.Geometry();

    _.each(f_faces, function(f) {
        var lv, rv, tv;
        lv = get_vertex(f.lv);
        rv = get_vertex(f.rv);
        tv = get_vertex(f.tv);
        geom.vertices.push(new THREE.Vector3(lv.x, lv.y, lv.z));
        geom.vertices.push(new THREE.Vector3(rv.x, rv.y, rv.z));
        geom.vertices.push(new THREE.Vector3(tv.x, tv.y, tv.z));
    });

    i = 0;
    _.each(f_faces, function(f) {
        var _f;
        _f = new THREE.Face3(i, i + 1, i + 2);
        _f.id = f.id;
        geom.faces.push(_f);
        i += 3;
    });

    return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 'black'}));
}

function update_scene(old_mesh, new_mesh) {
    old_mesh && scene.remove(old_mesh);
    scene.add(new_mesh);
}

function update_world() {
    old_mesh = new_mesh;
    new_mesh = set_geom();
    update_scene(old_mesh, new_mesh);
}

function get_middle_point(p1, p2) {
    var first_is_smaller, smaller_index,
        greater_index, key, k, v1, v2, i;

    first_is_smaller = p1 < p2;
    smaller_index = first_is_smaller ? p1 : p2;
    greater_index = first_is_smaller ? p2 : p1;
//    key = (smaller_index << 32) + greater_index;
    // Shift by 24 for JavaScript.
    key = (smaller_index << 24) + greater_index; 

    if (m_points[key]) {return m_points[key];}

    v1 = get_vertex(p1);
    v2 = get_vertex(p2);

    i = add_vertex((v1.x + v2.x) / 2,
                   (v1.y + v2.y) / 2,
                   (v1.z + v2.z) / 2);
    m_points[key] = i;

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

function assign_lf_cXn(f, lf) {
    var nf, r;
    if (!f.lcn) {return lf;}

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
    // Assign new left face to the hypotenuse neighbor(s).
    if (nt.HYPN === f.lcn.t) {
        nf = get_face(f.lcn.id);
        r = assign_hhn(lf, nf);
        lf = r.o;
        nf = r.n;
        // Store neighboring face.
        set_face(nf.id, nf);
    }
    return lf;
}

function assign_rf_cXn(f, rf) {
    var nf, r;
    if (!f.rcn) {return rf;}

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
    // Assign new right face to the hypotenuse neighbor(s).
    if (nt.HYPN === f.rcn.t) {
        nf = get_face(f.rcn.id);
        r = assign_hhn(rf, nf);
        rf = r.o;
        nf = r.n;
        // Store neighboring face.
        set_face(nf.id, nf);
    }
    return rf;
}

/*
 * Assign new cathetus or hypotenuse neighbors
 * to the newly split left (lf) and right (rf) faces.
 * Also assign the new faces as neighbors to their neighbors.
 */
function assign_hXn(f, lf, rf) {
    f.lcn && (lf = assign_lf_cXn(f, lf));
    f.rcn && (rf = assign_rf_cXn(f, rf));
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
    var f, n, sr, twr, r, srn, twrn, rn, cv;
    f = get_face(f_id);
    if (!f) {return [];}
    if (!f.hypn || (nt.HYPN !== f.hypn.t)) {
        return [];
    }

    sr = split_once(f);
    cv = sr[0].tv; // Common vertex.
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
        r = {rf: sr[1],
             twins: {lf: sr2[0], rf: sr2[1]}};
    }
    // Split right face of the main face.
    if (nt.RIGHT === which_cath) {
        sr2 = split_once(sr[1]);
        r = {lf: sr[0],
             twins: {lf: sr2[0], rf: sr2[1]}};
    }
    return r;
}

function split_hcn(f_id, which_cath = null, new_ns = {}, new_fs = [], old_fs = []) {
    var f, sr, twr, r, t, hcn_res, s2r, lf, rf, cv;

    f = get_face(f_id);
    if (!f) {return new_fs;}

    // No hypotenuse neighbor?
    if (_.isEmpty(new_ns) && !f.hypn) {
        return {new_fs: new_fs, old_fs: old_fs};
    }

    // Initial split.
    if (_.isEmpty(new_ns)) {
        sr = split_once(f);
        twr = assign_twins(sr[0], sr[1]);
        r = assign_hXn(f, twr.lf, twr.rf);
        new_fs.push(twr.lf, twr.rf);
        old_fs.push(f.id);
        new_ns = {lf: {id: twr.lf.id, ft: nt.RIGHT},
                  rf: {id: twr.rf.id, ft: nt.LEFT}};

        // Initial split always has a further face to split.
        return split_hcn(f.hypn.id, f.hypn.t, new_ns, new_fs, old_fs);
    }

    // Further division.
    sr2 = split_twice(f_id, which_cath);
    sr2.twins = assign_twins(sr2.twins.lf, sr2.twins.rf);

    // Assign bigger right face and left twin
    // as neighbors to each other.
    if (nt.LEFT === which_cath) {
        sr2.rf.rcn = {id: sr2.twins.lf.id, t: nt.HYPN};
        sr2.twins.lf.hypn = {id: sr2.rf.id, t: nt.RIGHT};
        sr2.rf = assign_rf_cXn(f, sr2.rf);
    }

    // Assign bigger left face and right twin
    // as neighbors to each other.
    if (nt.RIGHT === which_cath) {
        sr2.lf.lcn = {id: sr2.twins.rf.id, t: nt.HYPN};
        sr2.twins.rf.hypn = {id: sr2.lf.id, t: nt.LEFT};
        sr2.lf = assign_lf_cXn(f, sr2.lf);
    }

    // Assign new_ns and sr2.twins as neighbors to each other.
    lf = _.find(new_fs, function(f) {return f.id === new_ns.lf.id;});
    rf = _.find(new_fs, function(f) {return f.id === new_ns.rf.id;});
    new_fs = _.without(new_fs, lf);
    new_fs = _.without(new_fs, rf);

    sr2.twins.lf.rcn = {id: rf.id, t: new_ns.rf.ft};
    sr2.twins.rf.lcn = {id: lf.id, t: new_ns.lf.ft};

    if (new_ns.lf.ft === nt.RIGHT) {
        lf.rcn = {id: sr2.twins.rf.id, t: nt.LEFT};
        cv = lf.tv;
    }
    if (new_ns.lf.ft === nt.HYPN) {
        lf.hypn = {id: sr2.twins.rf.id, t: nt.LEFT};
        cv = lf.rv;
    }
    new_fs.push(lf);

    if (new_ns.rf.ft === nt.LEFT) {
        rf.lcn = {id: sr2.twins.lf.id, t: nt.RIGHT};
    }
    if (new_ns.rf.ft === nt.HYPN) {
        rf.hypn = {id: sr2.twins.lf.id, t: nt.RIGHT};
    }
    new_fs.push(rf);

    sr2.lf && new_fs.push(sr2.lf);
    sr2.rf && new_fs.push(sr2.rf);
    old_fs.push(f.id);

    new_fs.push(sr2.twins.lf);
    new_fs.push(sr2.twins.rf);

    // No hypotenuse neighbor? Stop.
    if (!f.hypn) {
        return {new_fs: new_fs, old_fs: old_fs};
    }

    // Cathetus neighbor? Split it.
    if (f.hypn && ((nt.LEFT  === f.hypn.t) ||
                   (nt.RIGHT === f.hypn.t))) {
        if (nt.LEFT === which_cath) {
            new_ns = {lf: {id: sr2.twins.rf.id, ft: nt.HYPN},
                      rf: {id: sr2.rf.id,       ft: nt.LEFT}};
        }
        if (nt.RIGHT === which_cath) {
            new_ns = {lf: {id: sr2.lf.id,       ft: nt.RIGHT},
                      rf: {id: sr2.twins.lf.id, ft: nt.HYPN}};
        }

        return split_hcn(f.hypn.id, f.hypn.t, new_ns, new_fs, old_fs);
    }

    // Hypotenuse neighbor? Split it here.
    // Finish sr2.twins.Xf and sr2.Xf neighbor assignments.
    if (f.hypn && (nt.HYPN === f.hypn.t)) {
        if (nt.LEFT === which_cath) {
            new_ns = {lf: {id: sr2.twins.rf.id, ft: nt.HYPN},
                      rf: {id: sr2.rf.id,       ft: nt.LEFT}};
        }
        if (nt.RIGHT === which_cath) {
            new_ns = {lf: {id: sr2.lf.id,       ft: nt.RIGHT},
                      rf: {id: sr2.twins.lf.id, ft: nt.HYPN}};
        }

        f = get_face(f.hypn.id);
        lf = _.find(new_fs, function(f) {return f.id === new_ns.lf.id;});
        rf = _.find(new_fs, function(f) {return f.id === new_ns.rf.id;});

        sr = split_once(f);
        old_fs.push(f.id);
        twr = assign_twins(sr[0], sr[1]);
        r = assign_hXn(f, twr.lf, twr.rf);

        new_fs = _.without(new_fs, lf);
        new_fs = _.without(new_fs, rf);

        if (nt.LEFT === which_cath) {
            lf.hypn  = {id: r.rf.id, t: nt.LEFT};
            rf.lcn   = {id: r.lf.id, t: nt.RIGHT};
            r.lf.rcn = {id: rf.id,   t: nt.LEFT};
            r.rf.lcn = {id: lf.id,   t: nt.HYPN};
        }
        if (nt.RIGHT === which_cath) {
            rf.hypn  = {id: r.lf.id, t: nt.RIGHT};
            lf.rcn   = {id: r.rf.id, t: nt.LEFT};
            r.lf.rcn = {id: rf.id,   t: nt.HYPN};
            r.rf.lcn = {id: lf.id,   t: nt.RIGHT};
        }

        new_fs.push(lf, rf, r.lf, r.rf);

        return {new_fs: new_fs, old_fs: old_fs};
    }

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

/*
 * Obtain face from given face ID f_id.
 * Look at the face's neighbors.
 * Call the appropriate split function.
 */
function split(f_id) {
    var f, r;

    f = get_face(f_id);

    if (!f.lcn && !f.rcn && !f.hypn) {
        r = split_0n(f_id);
        remove_face(f_id);
        f_faces = f_faces.concat(r);
    }
    
    if ((f.lcn || f.rcn) && !f.hypn) {
        r = split_cXn(f_id);
        remove_face(f_id);
        f_faces = f_faces.concat(r);
    }

    if (f.hypn && (nt.HYPN === f.hypn.t)) {
        r = split_hhn(f_id);
        remove_face(f_id);
        remove_face(f.hypn.id);
        f_faces = f_faces.concat(r);
    }

    if (f.hypn && ((nt.LEFT === f.hypn.t) ||
                   (nt.RIGHT === f.hypn.t))) {
        r = split_hcn(f_id);

        _.each(r.old_fs, function(f_id) {
            remove_face(f_id);
        });

        f_faces = f_faces.concat(r.new_fs);
    }

    // history.push({vs: JSON.parse(JSON.stringify(f_vertices)),
    //               fs: JSON.parse(JSON.stringify(f_faces))});
    // history_p += 1;
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
t0.hypn = {id: t1.id, t: nt.HYPN};
// t1.lcn = t2.id; t1.rcn = t4.id; t1.hypn = t0.id;
t1.lcn = {id: t2.id, t: nt.LEFT};
t1.rcn = {id: t4.id, t: nt.RIGHT};
t1.hypn = {id: t0.id, t: nt.HYPN};
t2.lcn = {id: t1.id, t: nt.LEFT};
t2.hypn = {id: t3.id, t: nt.HYPN};
t3.rcn = {id: t6.id, t: nt.RIGHT};
t3.hypn = {id: t2.id, t: nt.HYPN};
t4.rcn = {id: t1.id, t: nt.RIGHT};
t4.hypn = {id: t5.id, t: nt.HYPN};
t5.lcn = {id: t6.id, t: nt.LEFT};
t5.hypn = {id: t4.id, t: nt.HYPN};
t6.lcn = {id: t5.id, t: nt.LEFT};
t6.rcn = {id: t3.id, t: nt.RIGHT};
t6.hypn = {id: t7.id, t: nt.HYPN};
t7.hypn = {id: t6.id, t: nt.HYPN};

// f_faces = [t0];
// f_faces = [t1, t2];
// f_faces = [t0, t1, t2, t3, t4, t5, t6, t7];

// history.push({vs: JSON.parse(JSON.stringify(f_vertices)),
//               fs: JSON.parse(JSON.stringify(f_faces))});

var floor_half = floorSize / 2;

// "back" side
var v9 = add_vertex(-floor_half, -floor_half, -floor_half);
var v10 = add_vertex(floor_half, -floor_half, -floor_half);
var v11 = add_vertex(floor_half, floor_half, -floor_half);
var v12 = add_vertex(-floor_half, floor_half, -floor_half);

// "front" side
var v13 = add_vertex(-floor_half, -floor_half, floor_half);
var v14 = add_vertex(floor_half, -floor_half, floor_half);
var v15 = add_vertex(floor_half, floor_half, floor_half);
var v16 = add_vertex(-floor_half, floor_half, floor_half);

// "back" side
var t8 = {lv: v10, rv: v12, tv: v9, id: face_id(), name: "t8"};
var t9 = {lv: v12, rv: v10, tv: v11, id: face_id(), name: "t9"};

// "left" side
var t10 = {lv: v9, rv: v16, tv: v13, id: face_id(), name: "t10"};
var t11 = {lv: v16, rv: v9, tv: v12, id: face_id(), name: "t11"};

// "bottom" side
var t12 = {lv: v14, rv: v9, tv: v13, id: face_id(), name: "t12"};
var t13 = {lv: v9, rv: v14, tv: v10, id: face_id(), name: "t13"};

// "right" side
var t14 = {lv: v14, rv: v11, tv: v10, id: face_id(), name: "t14"};
var t15 = {lv: v11, rv: v14, tv: v15, id: face_id(), name: "t15"};

// "front" side
var t16 = {lv: v16, rv: v14, tv: v13, id: face_id(), name: "t16"};
var t17 = {lv: v14, rv: v16, tv: v15, id: face_id(), name: "t17"};

// "top" side
var t18 = {lv: v11, rv: v16, tv: v12, id: face_id(), name: "t18"};
var t19 = {lv: v16, rv: v11, tv: v15, id: face_id(), name: "t19"};

t8.rcn = {id: t11.id, t: nt.RIGHT};
t8.lcn = {id: t13.id, t: nt.LEFT};
t8.hypn = {id: t9.id, t: nt.HYPN};

t9.lcn = {id: t18.id, t: nt.LEFT};
t9.rcn = {id: t14.id, t: nt.RIGHT};
t9.hypn = {id: t8.id, t: nt.HYPN};

t10.lcn = {id: t12.id, t: nt.RIGHT};
t10.rcn = {id: t16.id, t: nt.LEFT};
t10.hypn = {id: t11.id, t: nt.HYPN};

t11.lcn = {id: t18.id, t: nt.RIGHT};
t11.rcn = {id: t8.id, t: nt.RIGHT};
t11.hypn = {id: t10.id, t: nt.HYPN};

t12.lcn = {id: t16.id, t: nt.RIGHT};
t12.rcn = {id: t10.id, t: nt.LEFT};
t12.hypn = {id: t13.id, t: nt.HYPN};

t13.lcn = {id: t8.id, t: nt.LEFT};
t13.rcn = {id: t14.id, t: nt.LEFT};
t13.hypn = {id: t12.id, t: nt.HYPN};

t14.lcn = {id: t13.id, t: nt.RIGHT};
t14.rcn = {id: t9.id, t: nt.RIGHT};
t14.hypn = {id: t15.id, t: nt.HYPN};

t15.lcn = {id: t19.id, t: nt.RIGHT};
t15.rcn = {id: t17.id, t: nt.LEFT};
t15.hypn = {id: t14.id, t: nt.HYPN};

t16.lcn = {id: t10.id, t: nt.RIGHT};
t16.rcn = {id: t12.id, t: nt.LEFT};
t16.hypn = {id: t17.id, t: nt.HYPN};

t17.lcn = {id: t15.id, t: nt.RIGHT};
t17.rcn = {id: t19.id, t: nt.LEFT};
t17.hypn = {id: t16.id, t: nt.HYPN};

t18.lcn = {id: t9.id, t: nt.LEFT};
t18.rcn = {id: t11.id, t: nt.LEFT};
t18.hypn = {id: t19.id, t: nt.HYPN};

t19.lcn = {id: t17.id, t: nt.RIGHT};
t19.rcn = {id: t15.id, t: nt.LEFT};
t19.hypn = {id: t18.id, t: nt.HYPN};

// f_faces = [t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13];
f_faces = [t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19];
// f_faces = [t8];

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
                 KEY_n: 78,
                 KEY_i: 73,
                 KEY_u: 85,
                 KEY_o: 79,
                 KEY_l: 76};

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
    if (!f_faces[n]) {
        return;
    }
    id = f_faces[n].id;
    split(id);
    old_mesh = new_mesh;
    new_mesh = set_geom();
    update_scene(old_mesh, new_mesh);
}

function split_id(f_id) {
    var id, f, faces;
    f = get_face(f_id);
    if (!f) {
        return;
    }
    split(f.id);
    update_world();
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
     
     if (e.keyCode === key_codes.KEY_u) {
         // history_p = (0 === history_p) ? 0 : (history_p -= 1);
         // if (!history[history_p]) {return;}
         // f_vertices = history[history_p].vs;
         // f_faces = history[history_p].fs;

         // update_world();
     }

     if (e.keyCode === key_codes.KEY_i) {
         // if (!history[history_p + 1]) {return;}
         // history_p += 1;
         // f_vertices = history[history_p].vs;
         // f_faces = history[history_p].fs;

         // update_world();
     }

     if (e.keyCode === key_codes.KEY_o) {
         remove_labels();
     }

     if (e.keyCode === key_codes.KEY_l) {
         label();
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
 });

var INTERSECTED = null;

document.addEventListener
('mousedown', function(e) {
    var vector, projector, raycaster, intersects, particle;

    if (2 !== e.which) {return;}

    // event.preventDefault();

    vector = new THREE.Vector3((e.clientX / window.innerWidth) * 2 - 1, - (e.clientY / window.innerHeight) * 2 + 1, 0.5);
    projector = new THREE.Projector();
    projector.unprojectVector(vector, camera);

    raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, vector.sub(camera.position).normalize());
    intersects = raycaster.intersectObjects(scene.children);

    !_.isEmpty(intersects) && split_id(intersects[0].face.id);
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
        spritey = makeTextSprite(" " + f_faces[i].name + " ", {fontsize: 32, backgroundColor: {r:0, g:0, b:0, a:0}});
        a = geom.vertices[geom.faces[i].a];
        c = geom.vertices[geom.faces[i].b];
        b = geom.vertices[geom.faces[i].c];

        _t = new THREE.Triangle(a, b, c);

//        spritey.position = _t.midpoint().clone().multiplyScalar(1.1);
        spritey.position = _t.midpoint().clone();
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



// split_id(f_faces[0].id);split_id(f_faces[0].id);split_id(f_faces[2].id);split_id(f_faces[2].id);
// split_id(f_faces[0].id);split_id(f_faces[0].id);split_id(f_faces[2].id);
// remove_labels(); label();
// split_id(f_faces[2].id);
