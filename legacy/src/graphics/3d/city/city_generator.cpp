/* Last updated 28 Apr 2004
 * city is a quadtree down to city block leaf nodes. A city block is a
 * container for other drawables (skyscrapers, buildings, trees etc)
 *
 * "A formula is worth a thousand pictures" - Dijkstra.
 *
 *
 */

#include "graphics/3d/city/cityblock.h"
#include "graphics/3d/city/city_generator.h"
#include "graphics/3d/city/parkland.h"
#include "graphics/3d/quadtree.h"
#include "kong.h"
#include "util/MersenneTwister.h"
#include "util/util.h"
#include <iostream>

#define DO_SIDEWALK_OBJECTS 1

using namespace std;


// Subdivide into quadtrees starting with sides of length forming child nodes
// when smaller than min_side_length.
Drawable* City_Generator(float width, float height, float min_side_length)
{
    // FIXME: we could set random seed here according to grid location so
    // the generation below is CONSISTANT (if we want a persistant world)
    static MTRand mt(42); 

    Drawable* newchild;

    if( width > min_side_length ) { // then subdivide
	newchild = new Quadtree(vector3(width, height, width));
	width /= 2;
	for( int i=0 ; i<4 ; i++ ) {
	    newchild->add( City_Generator(width, height, min_side_length));
	}
    } else { // leaf node
	GLfloat len = width*(1.0f-(STREET_WIDTH_RATIO+SIDEWALK_WIDTH_RATIO));
	if( mt.rand() < 0.1f )
	    newchild = new Parkland(mt, len, len);
	else
	    newchild = new CityBlock(mt, len);
    }

    return newchild;

}


