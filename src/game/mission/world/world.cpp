// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 02 Jan 2005

#include "entities/entity.h"
#include "entities/monkey.h"
#include "entities/entitydrawer.h"
#include "graphics/2d/chyron.h"
#include "graphics/2d/image.h"
#include "graphics/2d/shadow.h"
#include "graphics/2d/text2d.h"
#include "graphics/3d/city/city_generator.h"
#include "graphics/3d/model.h"
#include "graphics/display.h"
#include "graphics/timer.h"
#include "kong.h"
#include "util/util.h"
#include "world.h"
#include <iostream>

using namespace std;


World::World():
    city(0),
    entity_drawer(0),
    update_smoother(4)
{
    ////////////////// 3d

    Timer t; // start timing...
    city = PatchGridFactory();
    foreground.add( city );
    cout << "Skyscraper generation took " << t.tick() << " msecs" << endl;

    entity_drawer = new EntityDrawer(&entities);
    foreground.add( entity_drawer );

    // NOTE - removed because fog makes these almost invisible 
    //        sourcefiles moved to "src/00-OTHER-CODE"
    //  BACKGROUND
    //background.add( new SkyBox(length) );
    //background.add( new SkyLine(sqrt((length/2) * (length/2)), 500.0f ));

}




// Note: everything added to foreground and background will be automatically
//       cleaned up when they go out of scope when world is destroyed.
World::~World(void)
{
    /*
      // FIXME: This deletes controllers, which are also deleted in ~Player
    // Delete all entities
    entlist_t::iterator i, end=entities.end();
    for( i = entities.begin() ; i != end ; ++i ) {
	delete *i;
    }
    */
}



class isDead : public unary_function<Entity*, bool> {
public:
    bool operator()(Entity* ent) const {
	bool dead = ent->isDead();
	if( dead )
	    delete ent;
	return dead;
    };
};


void World::update(Uint32 msecs)
{
    //   cout << "World::update()\n";

    Uint32 tm = 0;
    if( msecs ) {
	update_smoother.add( msecs );
	tm = msecs;//update_smoother.getMean();
	//cout << msecs << "ms " << "avg (10) = " << tm << " ms\n";

	entlist_t::iterator i, end = entities.end();
	for( i = entities.begin() ; i != end ; ++i ) {
	    (*i)->update( *this, tm );//msecs );
	}
	entities.remove_if( isDead() );
    }
}


void World::draw(Camera* camera)
{
    glPushAttrib( GL_ALL_ATTRIB_BITS );
    glEnable(GL_LIGHTING);
    glEnable(GL_FOG);
    glEnable(GL_DEPTH_TEST);

    city->setPosition( camera->getPosition() );
    Display::Instance().draw_context_3d( camera, &background, foreground );

    glPopAttrib();
}


void World::addEntity(Entity* ent)
{
    entities.push_back( ent );
}
