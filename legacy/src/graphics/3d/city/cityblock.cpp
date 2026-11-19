// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu May  5 18:40:44 2005
// Last modified: Thu May  5 18:40:44 2005

#include "cityblock.h"
#include "graphics/3d/billboards.h"
#include "graphics/3d/city/building.h"
#include "graphics/3d/city/skyscraper.h"
#include "graphics/3d/crosstree.h"
#include "graphics/3d/model.h"
#include "kong.h"
#include "util/MersenneTwister.h"
#include "util/util.h"

using namespace std;


void subdivide_block(CityBlock *parent,
					 MTRand& mt,
					 vector3 pos,
					 GLfloat x_span, GLfloat z_span,
					 GLfloat height,
					 int curb=NORTH_BIT|EAST_BIT|SOUTH_BIT|WEST_BIT);


static const float UPPER_BOUNDS = 500;
static const float LOWER_BOUNDS = 100;

static const float MIN_HEIGHT = 150.0f;
static const unsigned int BUILDING_HEIGHT_VAR = 300;
static const unsigned int HEIGHT_VARIANCE = 800;

static const float LAMP_SCALE = 0.004f;
static const float HYDRANT_SCALE = 0.015f;
static const float MAILBOX_SCALE = 0.02f;
static const float TREE_SIZE = 50.0f;

static const float LAMP_LOD = 0.85f;
static const float TREE_LOD = 0.6f;
static const float HYDRANT_LOD = 0.9f;
static const float FUDGE = 2.0f;

#define DO_SIDEWALK_OBJECTS 0


CityBlock::CityBlock(MTRand& mt, GLfloat length):
	DrawableContainer()
{
	GLfloat height = MIN_HEIGHT + (float)mt.rand() * BUILDING_HEIGHT_VAR;
	//GLfloat len = length*(1.0f-(STREET_WIDTH_RATIO+SIDEWALK_WIDTH_RATIO));
	GLfloat len = length; //*(1.0f-(STREET_WIDTH_RATIO+SIDEWALK_WIDTH_RATIO));
	vector3 pos(0.0f, 0.0f, 0.0f);
	subdivide_block( this, mt, pos, len, len, height );

#if DO_SIDEWALK_OBJECTS

	GLfloat edge_of_sidewalk = len * 0.5f + SIDEWALK_WIDTH_RATIO*length;
	edge_of_sidewalk -= FUDGE;
	unsigned int i, j;

#if 1
	////////////// LAMPS
	Drawable *obj;
	static const unsigned int NUM_OBJS = 5;

	GLfloat lod = 0.0f;
	GLfloat spacing = (2.0f*edge_of_sidewalk) / (NUM_OBJS-1);
	pos.set(0.0f, 0.0f, 0.0f);

	for( i=0 ; i<2 ; i++ ) {
		pos.x = i? edge_of_sidewalk : -edge_of_sidewalk;
		pos.z = -edge_of_sidewalk;
		for( j=0 ; j<NUM_OBJS ; j++ ) {
			if( j==0 || j==NUM_OBJS-1 ) {
				height = 0.0f;
				obj = Model::Factory("lamp_post.obj", "lamp_post_color.jpg");
				lod = LAMP_LOD;
			} else {
				height = TREE_SIZE + mt.rand() * 20.0f;
				obj = new CrossTree(20.0f, height);
				lod = TREE_LOD;
			}
			obj->setScale( LAMP_SCALE );
			obj->rotate( 0.0f, i? -90.0f : 90.0f, 0.0f );
			obj->setPosition( pos.x, pos.y + height*0.5f, pos.z );
			this->add( obj, lod );
			pos.z += spacing;
		}
	}

	for( i=0 ; i<2 ; i++ ) {
		pos.x = -edge_of_sidewalk + spacing;
		pos.z = i? edge_of_sidewalk : -edge_of_sidewalk;

		for( j=1 ; j<NUM_OBJS-1 ; j++ ) { //-2 shared lamps
			if( j==0 || j==NUM_OBJS-1 ) {
				height = 0.0f;
				obj = Model::Factory("lamp_post.obj", "lamp_post_color.jpg");
				lod = LAMP_LOD;
			} else {
				height = TREE_SIZE + mt.rand() * 20.0f;
				obj = new CrossTree(20.0f, height);
				lod = TREE_LOD;
			}

			obj->setScale( LAMP_SCALE );
			obj->rotate( 0.0f, i? 180.0f : 0.0f, 0.0f );
			obj->setPosition( pos.x, pos.y + height*0.5f, pos.z );
			this->add( obj, lod );
			pos.x += spacing;
		}
	}

#else
	////////////// LAMPS
	Drawable *obj;
	static const unsigned int NUM_OBJS = 7;

	GLfloat lod = 0.0f;
	GLfloat spacing = (2.0f*edge_of_sidewalk) / (NUM_OBJS-1);
	pos.set(0.0f, 0.0f, 0.0f);

	for( i=0 ; i<2 ; i++ ) {
		pos.x = i? edge_of_sidewalk : -edge_of_sidewalk;
		pos.z = -edge_of_sidewalk;
		for( j=0 ; j<NUM_OBJS ; j++ ) {
			if( j%3 ) {
				height = 50.0f + mt.rand() * 20.0f;
				obj = new CrossTree(20.0f, height);
				if( j%2 )
					lod = TREE_LOD;
				else
					lod = LAMP_LOD;
			} else {
				height = 0.0f;
				obj = Model::Factory("lamp_post.obj", "lamp_post_color.jpg");
				lod = LAMP_LOD;
			}
			obj->scale( LAMP_SCALE );
			obj->rotate( 0.0f, i? -90.0f : 90.0f, 0.0f );
			obj->setPosition( pos.x, pos.y + height*0.5f, pos.z );
			this->add( obj, lod );
			pos.z += spacing;
		}
	}

	for( i=0 ; i<2 ; i++ ) {
		pos.x = -edge_of_sidewalk + spacing;
		pos.z = i? edge_of_sidewalk : -edge_of_sidewalk;

		for( j=1 ; j<NUM_OBJS-1 ; j++ ) { //-2 shared lamps
			if( j%3 ) {
				height = 50.0f + mt.rand() * 20.0f;
				obj = new CrossTree(20.0f, height);
				if( j%2 )
					lod = TREE_LOD;
				else
					lod = LAMP_LOD;
			} else {
				height = 0.0f;
				obj = Model::Factory("lamp_post.obj", "lamp_post_color.jpg");
				lod = LAMP_LOD;
			}

			obj->scale( LAMP_SCALE );
			obj->rotate( 0.0f, i? 180.0f : 0.0f, 0.0f );
			obj->setPosition( pos.x, pos.y + height*0.5f, pos.z );
			this->add( obj, lod );
			pos.x += spacing;
		}
	}

#endif


#if 0
	Drawable* mailbox = Model::Factory("mail_box.obj", "mail_box.png");
	mailbox->setPosition( mid_road + 1.3f*FUDGE,
		0.0f,
		-50.0f + mt.rand() * 100.0f;
	mailbox->scale( MAILBOX_SCALE );
	mailbox->rotate( 0.0f, -90.0f, 0.0f );
	this->add( mailbox, HYDRANT_LOD );

	Drawable* hydrant = Model::Factory("fire_hydrant.obj", "fire_hydrant.jpg");
	hydrant->setPosition( mid_road - 1.3f*FUDGE,
		0.0f,
		-50.0f + mt.rand() * 100.0f;
	hydrant->scale( HYDRANT_SCALE );
	this->add( hydrant, HYDRANT_LOD );
#endif
#endif

#if BB_ROOVES
	Texture* roof = Texture_Factory("data/images/city/building_top_dark2.jpg");
	rooftex = roof->getTexId();
	delete roof;
#endif

}

#if BB_ROOVES
void CityBlock::representation(drawdetails_t& drawdetails)
{
	DrawableContainer::representation(drawdetails);
	vector<billboard_t>::iterator i, end = rooves.end();
	for( i=rooves.begin() ; i != end ; ++i ) {
		billboard_t bb = *i;
		bb.pos += drawdetails.offset;
		//bb.rot    = getRotation().y;
		billboards_addh( rooftex, bb );
	}

}


void CityBlock::add_roof(float w, float h, vector3 pos)
{
	billboard_t bb;
	bb.pos    = pos;
	bb.rot	  = 0;
	bb.width  = w;
	bb.height = h;
	rooves.push_back( bb );
}
#endif



static const unsigned int SKYSCRAPER_CHANCE = 25; // percent
static const int HEIGHT_VARIATION = 20;
static const float MIN_BUILDING_WIDTH = 80.0f;
static const float SPACING = 5.0f;

// Use curb to make sure that the subdivision isn't landlocked.
void subdivide_block(CityBlock *parent,
					 MTRand& mt,
					 vector3 pos,
					 GLfloat x_span, GLfloat z_span,
					 GLfloat height,
					 int curb )
{
	Drawable *building;

	if( height > LOWER_BOUNDS && height < UPPER_BOUNDS )
		height += (float)mt.rand() * HEIGHT_VARIATION - 2*HEIGHT_VARIATION;

	GLfloat shortest_side_len = MIN( x_span, z_span );

	// stop subdividing if not enough space
	if( shortest_side_len < 2 * MIN_BUILDING_WIDTH ) {
		building = new Building( mt, x_span, height, z_span );
		building->setPosition( pos );
		parent->add( building);
#if BB_ROOVES
		pos.y = height;
		parent->add_roof( x_span, z_span, pos );
#endif
		return;
	} else if( (float)mt.rand() * 100.0f < SKYSCRAPER_CHANCE ) {
		height += shortest_side_len * 5.0f;
		//height += mt.rand() * HEIGHT_VARIANCE;
		building = new Skyscraper( mt, shortest_side_len, height );
		building->setPosition( pos );
		parent->add(building);
		return;
	}

	GLfloat len;
	int extra;
	vector3 offset(0.0f, 0.0f, 0.0f);
	vector3 place;

	if( (x_span >= z_span || !(curb & (WEST_BIT|EAST_BIT)))
		&& curb & (NORTH_BIT|SOUTH_BIT) ) {
			// HORIZONTAL (X) SPLIT
			x_span -= SPACING;
			len = MIN_BUILDING_WIDTH;
			extra = (int)(x_span - 2*MIN_BUILDING_WIDTH);
			if( extra > 0 )
				len += (float)mt.rand() * extra;
			offset.x = x_span/2 + SPACING * 0.5f;
			place = pos - offset;
			place.x += len/2.0f;
			subdivide_block(parent, mt, place,
							len, z_span, height,
							curb & ~EAST_BIT );
			place = pos + offset;
			place.x -= (x_span-len)/2.0f;
			subdivide_block(parent, mt, place,
							x_span-len, z_span, height,
							curb & ~WEST_BIT );
	} else { // VERTICAL (Z) SPLIT
		z_span -= SPACING;
		len = MIN_BUILDING_WIDTH;
		extra = (int)(z_span - 2*MIN_BUILDING_WIDTH);
		if( extra > 0 )
			len += (float)mt.rand() * extra;
		offset.z = z_span/2.0f + SPACING * 0.5f;
		place = pos + offset;
		place.z -= len/2.0f;
		subdivide_block(parent, mt, place,
						x_span, len, height,
						curb & ~SOUTH_BIT);

		place = pos - offset;
		place.z += (z_span-len)/2.0f;

		subdivide_block(parent, mt, place,
						x_span, z_span-len, height,
						curb & ~NORTH_BIT);
	}

}
