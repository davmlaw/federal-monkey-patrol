// (C) David Lawrence released under the GPL (see license.txt)
// Started:       06 Feb 2004
// Last modified: 12 May 2004

#include "graphics/3d/quadtree.h"
#include <assert.h>
#include <iostream>

using namespace std;

unsigned int Quadtree::render_order[4] = { 0, 1, 2, 3 };

Quadtree::Quadtree(const vector3& dim):
	DrawableAABB(dim), num_children(0)
{

}

Quadtree::Quadtree(const AABB& aabb):
	DrawableAABB(aabb), num_children(0)
{

}

Quadtree::~Quadtree()
{
	for( unsigned int i=0 ; i<num_children ; ++i ) {
		delete child[i];
	}
}



void Quadtree::representation(drawdetails_t& drawdetails)
{
    for( unsigned int i=0 ; i<4 ; i++ ) {
		child[ render_order[i] ]->draw( drawdetails );
    }
}


void Quadtree::add(Drawable *d)
{
	if( num_children >= 4 ) {
		cout << "ERROR (__FILE__): add() when num_children >= 4!\n";
		return;
	}

	// update height if new child is taller than others.
	if( d->getHeight() > this->getHeight() )
		setHeight( d->getHeight() );

	child[num_children] = d;

/*	Position in correct quarter of node.
 *  Quadtree children:  |-------|
 *                      | 0 | 1 |
 *                      Z-------|
 *                      | 2 | 3 |
 *                      |<--X-->|
 */
	vector3 offset; // child relative to parent's centre.
	GLfloat dist = aabb.getDimensions().x / 4;
	if( num_children & 1 )
		offset.x =  dist; // Odd, ie right side (see ASCII above)
	else
		offset.x = -dist; // Even, left side

	offset.y = 0.0f;

	if( num_children < 2 )
		offset.z =  dist; // Top two
	else
		offset.z = -dist; // bottom

	child[num_children]->setPosition( offset );
	++num_children;

}


void Quadtree::setup_render_front_to_back(const vector3& heading)
{
	// defaults are for heading -> +X, +Z
	render_order[0] = 2;
	render_order[1] = 3;
	render_order[2] = 0;
	render_order[3] = 1;

	if( heading.x < 0 ) { // SWAP X
		swap( render_order[0], render_order[1] );
		swap( render_order[2], render_order[3] );
	}
	if( heading.z < 0 ) { // SWAP Z
		swap( render_order[0], render_order[2] );
		swap( render_order[1], render_order[3] );
	}

}

Quadtree* Quadtree::clone(void) const
{
	Quadtree* quadTree = new Quadtree(this->aabb);
    for( unsigned int i=0 ; i<4 ; i++ ) {
		quadTree->add(child[i]->clone());
	}
	return quadTree;
}