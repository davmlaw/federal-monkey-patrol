// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Apr 16 21:46:00 2005
// Last modified: Sat Apr 16 21:46:00 2005

#include "game/storyteller/dialogue.h"
#include "graphics/2d/wordlist2d.h"
#include "sound/soundmanager.h"
#include <iostream>
#include <string.h>

static const float BORDER = 0.03f;
static const float PICTURE_SIZE = 0.1f;

using namespace std;

Dialogue::Dialogue(GLfloat w, GLfloat h, Image* image, strings_t& wordlist,
		   int msec_initial, int msec_per_word):
    time_displayed(0),
    time_total(0),
    sound(0),
    sound_started(false)
{
    float border = w * BORDER;

    vector2 size(w, h);
    size -= 2 * vector2(border, border); // reduce by border all around

    container = new Container2D( size.x, size.y );

    vector2 top_left;
    top_left.x = -size.x / 2;
    top_left.y =  size.y / 2;
    
    vector2 pos(0.0f, 0.0f); // center of blank space

    if( image ) {
	image->setWidth( w * PICTURE_SIZE );
	vector2 portraitsize( image->getWidth(),
			     -image->getHeight());
	image->position = top_left + portraitsize/2;
	container->add( image );

	// shift text right
	pos.x += (portraitsize.x + border)/2;
	size -= image->getSize() + vector2(border, 0.0f);
    }

    Uint32 time_fixed = 0;

    strings_t::iterator i;
    for( i = wordlist.begin() ; i != wordlist.end() ; ++i ) {
	// If we need any more "special" things - do this more intelligently.
	if( !sound ) {
	    const string key = "SOUND=";
	    string::size_type pos = i->find(key);
	    if( pos != string::npos ) {
		sound = new Chunk();
		sound->load( i->substr(key.length()), SoundManager::STORY );
		wordlist.erase(i);
		i = wordlist.begin(); // vector iterator invalid after erase
		continue;
	    }
	}
	if( !time_fixed ) {
	    const string key = "TIME=";
	    string::size_type pos = i->find(key);
	    if( pos != string::npos ) {
		time_fixed = atol(i->substr(key.length()).c_str());
		wordlist.erase(i);
		i = wordlist.begin(); // vector iterator invalid after erase
		continue;
	    }
	}
    }

    WordList2D* text = new WordList2D(size.x, size.y, wordlist);
    text->position = pos;
    text->position.y = top_left.y - text->getHeight()/2;
    time_total = msec_initial + text->getWordCount() * msec_per_word;
    time_total = MAX( time_total, time_fixed );

    container->add(text);

}


Dialogue::~Dialogue()
{
    delete container;
    delete sound;
}


void Dialogue::representation(float alpha)
{
    container->draw(alpha);
}


void Dialogue::speak(Uint32 msecs)
{
    if( sound && !(sound_started || done()) ) {
	sound->play();
	sound_started = true;
    }
    time_displayed += msecs;
    Display::Instance().draw_context_2d( this );
}


bool Dialogue::done(void)
{
    bool done = true;
    if( sound ) {
	done &= sound->done();
    }
    done &= time_displayed >= time_total;
    return done;
}
