#include <stdio.h>
#include <string.h>

#include "kong.h"
#include "box.h"

Box *Box_Factory(GLfloat x_span, GLfloat y_span, GLfloat z_span)
{
    Box *millhouse = NULL;

    millhouse = new Box();

    millhouse->load(x_span, y_span, z_span);
    millhouse->setTexture("data/tux_sit.bmp");
    millhouse->process();

    return millhouse;

}


void Box::load(GLfloat x, GLfloat y, GLfloat z)
{

    height = y;

    // These are the only 4 texcoords we need.
    add_texcoord( 0.0, 0.0 ); // Top left
    add_texcoord( 0.0, 1.0 ); // Bottom left
    add_texcoord( 1.0, 1.0 ); // Bottom Right
    add_texcoord( 1.0, 0.0 ); // Top right

    // FIXME: Does setting normals work in a mesh properly? 
    add_normal( 0.0, 0.0, 1.0 ); // front
    add_normal( 0.0, 0.0, -1.0 ); // back 
    add_normal( -1.0, 0.0, 0.0 ); // left
    add_normal( 1.0, 0.0, 0.0 ); // right
    add_normal( 0.0, 1.0, 0.0 ); // up

    // Front 4 vertices.
    add_vertex( -x/2, y, z/2 );  // 0
    add_vertex( -x/2, 0, z/2 );  // 1
    add_vertex( x/2, 0, z/2 );   // 2
    add_vertex( x/2, y, z/2 );   // 3

    // Back 4 vertices.
    add_vertex( -x/2, y, -z/2 ); // 4
    add_vertex( -x/2, 0, -z/2 ); // 5
    add_vertex( x/2, 0, -z/2 );  // 6
    add_vertex( x/2, y, -z/2 );  // 7

    Face a,b; // a+b one side
    // The texcoords remain constant
    a.texcoord_idx[0] = 0;
    a.texcoord_idx[1] = 3;
    a.texcoord_idx[2] = 2;
    b.texcoord_idx[0] = 2;
    b.texcoord_idx[1] = 1;
    b.texcoord_idx[2] = 0;

    // FRONT
    a.normal_idx[0] = 0;
    a.normal_idx[1] = 0;
    a.normal_idx[2] = 0;

    a.vertex_idx[0] = 0;
    a.vertex_idx[1] = 3;
    a.vertex_idx[2] = 2;
    add_face(a);

    b.normal_idx[0] = 0;
    b.normal_idx[1] = 0;
    b.normal_idx[2] = 0;

    b.vertex_idx[0] = 2;
    b.vertex_idx[1] = 1;
    b.vertex_idx[2] = 0;
    add_face(b);

    // BACK
    a.normal_idx[0] = 1;
    a.normal_idx[1] = 1;
    a.normal_idx[2] = 1;

    a.vertex_idx[0] = 7;
    a.vertex_idx[1] = 4;
    a.vertex_idx[2] = 5;
    add_face(a);

    b.normal_idx[0] = 1;
    b.normal_idx[1] = 1;
    b.normal_idx[2] = 1;

    b.vertex_idx[0] = 5;
    b.vertex_idx[1] = 6;
    b.vertex_idx[2] = 7;
    add_face(b);

    // LEFT
    a.normal_idx[0] = 2;
    a.normal_idx[1] = 2;
    a.normal_idx[2] = 2;

    a.vertex_idx[0] = 4;
    a.vertex_idx[1] = 0;
    a.vertex_idx[2] = 1;
    add_face(a);

    b.normal_idx[0] = 2;
    b.normal_idx[1] = 2;
    b.normal_idx[2] = 2;

    b.vertex_idx[0] = 1;
    b.vertex_idx[1] = 5;
    b.vertex_idx[2] = 4;
    add_face(b);

    // RIGHT
    a.normal_idx[0] = 3;
    a.normal_idx[1] = 3;
    a.normal_idx[2] = 3;

    a.vertex_idx[0] = 3;
    a.vertex_idx[1] = 7;
    a.vertex_idx[2] = 6;
    add_face(a);

    b.normal_idx[0] = 3;
    b.normal_idx[1] = 3;
    b.normal_idx[2] = 3;

    b.vertex_idx[0] = 6;
    b.vertex_idx[1] = 2;
    b.vertex_idx[2] = 3;
    add_face(b);

    // TOP
    a.normal_idx[0] = 4;
    a.normal_idx[1] = 4;
    a.normal_idx[2] = 4;

    a.vertex_idx[0] = 4;
    a.vertex_idx[1] = 7;
    a.vertex_idx[2] = 3;
    add_face(a);

    b.normal_idx[0] = 4;
    b.normal_idx[1] = 4;
    b.normal_idx[2] = 4;

    b.vertex_idx[0] = 3;
    b.vertex_idx[1] = 0;
    b.vertex_idx[2] = 4;
    add_face(b);


}
