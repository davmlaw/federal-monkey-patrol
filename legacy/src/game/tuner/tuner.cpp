// (C) David Lawrence released under the GPL (see license.txt)
// Started:       08 Dec 2004
// Last modified: 08 Dec 2004

#include "game/tuner/toggle/togglefloat.h"
#include "game/tuner/toggle/togglelist.h"
#include "game/tuner/toggle/toggleswitch.h"
#include "game/tuner/tuner.h"
#include "game/tuner/menu/submenuitem2d.h"
#include "game/tuner/menu/togglemenuitem2d.h"
#include "graphics/2d/text2d.h"
#include "graphics/display.h"
#include "sound/soundmanager.h"
#include "util/settings.h"
#include <iostream>
#include <stdlib.h>
#include <string>

#include "game/tuner/menu/submenuitem2d.h"

using namespace std;

/*
  FIXME: Make it look like this

           Imperial War Monkey Tuner v0.1a

   Plane speed               |---*-----------| 100.0
   Monkey speed              |-*-------------| 080.0
   Giant Claw                |*--------------| FALSE
   Something true            |--------------*| TRUE

   currently active... go through, if left/right then ++ or --
   bools -- = false, ++ = true
   others go up and down by increment, clamping between MIN & MAX

   have a huge list of keys that call the settings file.

*/

extern Settings settings;


Tuner::Tuner(): GameComponent()
{
    color[3] = 0.7f; // Tuner Opacity

    const Properties<Scalar>* prop = settings.get("tuner");
    setWidth(  Display::ORTHO_W * (float)prop->get("width") );
    setHeight( Display::ORTHO_H * (float)prop->get("height") );
//    bodyfont  = prop.get("bodyfont");
    hexcolor( bgcolor,   prop->get("bgcolor"));
    hexcolor( textcolor, prop->get("textcolor"));

    background = new Quad(getWidth(), getHeight());
    background->setColor( bgcolor );

    title = new Text2D( prop->get("title"), prop->get("titlefont") );
    title->setColor( textcolor );
    float pad = 0.01f;
    title->position.y = getHeight()/2 - title->getHeight()/2 - pad;

    strings_t subnames = settings.keys();
    int rows = (int)subnames.size();

    box = new Menu2D( "Settings Menu", rows );
    box->position.y = -title->getHeight()/2;

    float menu_w = getWidth() - 2 * pad;
    float menu_h = getHeight() - title->getHeight() - 2 * pad;
    float row_h = menu_h / rows;
    box->setWidth ( menu_w );
    box->setHeight( menu_h );

    strings_t::iterator si;
    for( si = subnames.begin() ; si != subnames.end() ; ++si ) {
	box->add( new SubMenuItem2D(menu_w, row_h, *si) );
    }
}


Tuner::~Tuner()
{
    delete background;
    delete title;
    delete box;
}


void Tuner::_play(Uint32 msecs, Input* input, float alpha)
{
    menu.read( *input );

    bool didsomething = true;

    if( menu.up() ) {
	box->up();
    } else if (menu.down()) {
	box->down();
    } else if( menu.right() ) {
	box->right();
    } else if (menu.left() ) {
	box->left();
    } else if( menu.ok() ) {
	box->trigger();
    } else {
	didsomething = false;
    }

#if 0 // temp disable sound
    if( didsomething )
	SoundManager::Instance().playSFX( SoundManager::MENU_MOVE );
#endif

    Display::Instance().draw_context_2d( this, alpha );
}


void Tuner::representation(GLfloat alpha)
{
    background->draw(alpha);
    title->draw(alpha);
    box->draw(alpha);
}
