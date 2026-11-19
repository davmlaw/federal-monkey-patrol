// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 23:02:36 2005
// Last modified: Sat Jul  2 23:02:36 2005

#include "gamefilereader.h"
#include "game/blank/blank.h"
#include "game/mission/mission.h"
#include "game/picture/picture.h"
#include "game/soundtrack/soundtrack.h"
#include "game/storyteller/storyteller.h"
#include "game/transition/transition.h"

using namespace std;


void GameFileReader::handle_line(string& line)
{
    strings_t wordlist = split( line );

    string error_message = "GameFileReader(" + line + "): ";

    if( wordlist.size() < 2 ) {
	throw error_message + " line too short";
    }

    string& component = wordlist[0];

    if( wordlist.size() == 3 && component == "transition" ) {
	Transition* t = Transition_Factory( wordlist[1] );
	if (t == NULL) {
	    throw error_message + " bad transition";
	}
	Uint32 msecs = atoi( wordlist[2].c_str() );
	t->setTime( msecs );
	gm->setTransition(t);
    } else {
	GameComponent* gc = NULL;

	if( component == "storyteller" ) {
	    StoryTeller* st = new StoryTeller();
	    st->setFilename( wordlist[1] );
	    gc = st;
	} else if( component == "mission" ) {
	    Mission* ms = new Mission( wordlist[1] );
	    gc = ms;
	} else if( component == "blank" ) {
	    Blank* bk = new Blank;

	    GLfloat col[4];
	    int num = hexcolor(col, wordlist[1]);
	    if( num >= 3 ) {
		bk->setColor(col[0], col[1], col[2]);
	    }
	    gc = bk;
	} else if( component == "picture" ) {
	    Picture* pic = new Picture();
	    pic->setFilename( wordlist[1] );
	    if( wordlist.size() >= 3 ) {
		Uint32 msecs = atoi( wordlist[2].c_str() );
		pic->setTime( msecs );
	    }

	    if( wordlist.size() >= 4 ) {
		GLfloat col[4];
		hexcolor(col, wordlist[3]);
		pic->setColor(col[0], col[1], col[2]);
	    }
	    gc = pic;
	} else if( component == "music" ) {
	    SoundTrack* sndtrack = new SoundTrack();
	    sndtrack->setFilename( wordlist[1] );
	    gc = sndtrack;
	} else {
	    throw error_message + " invalid line";
	}
	gm->addComponent(gc);
    }

    
}


