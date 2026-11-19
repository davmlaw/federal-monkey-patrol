// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 19 Dec 2004

#include "game/gamemanager.h"
#include "game/gamefilereader.h"
#include "input/menufilter.h"
#include "graphics/display.h"
#include <iostream>
#include <string>
#include <vector>

using namespace std;


GameManager::GameManager(string filename):
	transition(NULL), last_gcr(NULL)
{
	cout << "GameManager: " << filename << endl;

	GameFileReader(filename, this);
	delete last_gcr; // no more components to add, so don't need this.
	current = components.begin();
	status = PLAYING;
}


// FIXME: resources could be more neatly handled, here...
void GameManager::_play(Uint32 msecs, Input* input, float alpha)
{
	// Render current component
	Display& d = Display::Instance();
	d.clear(GL_DEPTH_BUFFER_BIT);

	menu.read( *input );
	if( menu.tuner() ) {
		(**current)->play(0, NULL);
		tuner.play(msecs, input);
	} else {
		(**current)->play(msecs, input);
	}

	d.swap_buffers();

	// Update components
	game_status_t current_status = (**current)->getStatus();

	if( menu.quit() || current_status == QUIT ) {
		GameComponent::status = QUIT;
	} else if( menu.skip() || current_status == NEXT ) {
		delete *current;
		*current = 0; // so it can be delete later
		if( ++current == components.end() ) { // the end
			GameComponent::status = QUIT;
		}
	} else if( current_status == LOST ) {
		cout << "LOSTY WOSTY!\n";
		GameComponent::status = QUIT;
	}

}


GameManager::~GameManager()
{
	gc_list_t::iterator c;
	for( c=components.begin() ; c != components.end() ; ++c ) {
		delete *c;
	}
}


void GameManager::setTransition(Transition *t)
{
	if( transition ) {
		cout << "Warning: 2 sequential transitions\n";
		delete transition;
	}
	transition = t;
}


void GameManager::addComponent(GameComponent* g)
{
	GameComponentRef* gcr = new GameComponentRef(g);

	if( transition ) {
		transition->setPrev( last_gcr );
		transition->setNext( gcr );
		components.push_back( new GameComponentRef(transition) );
		transition = NULL;
	}

	components.push_back(gcr);

	delete last_gcr;
	last_gcr = new GameComponentRef(*gcr);
}

