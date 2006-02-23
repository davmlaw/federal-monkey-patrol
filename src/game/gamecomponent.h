// (C) David Lawrence released under the GPL (see license.txt)
// Started:       23 Nov 2004
// Last modified: 23 Nov 2004

#ifndef GAMECOMPONENT_H
#define GAMECOMPONENT_H

#include "graphics/timer.h"
#include "input/input.h"
#include "util/referencecount.h"
#include <string>
#include <vector>
#include <iostream>
#include <map>

typedef enum {
	PLAYING,
	NEXT,
	LOST,
	QUIT,
	NUM_GAME_STATUSES
} game_status_t;

typedef std::map<std::string,game_status_t> GameStatusMap;

/**
 * Base class for components that makes up the game
 */
class GameComponent {
public:
	static const char* gameStatusName(game_status_t i);
	static const game_status_t gameStatusFromName(const std::string& name);
	GameComponent():
	status(NEXT),
		loaded(false) { };
	virtual ~GameComponent() { };
	void play(Uint32 msecs, Input* input, float alpha=1.0f) {
		load();
		_play(msecs, input, alpha);
	};
	void load(void) {
		if( !loaded ) {
			_load();
			loaded = true;
		}
	};
	game_status_t getStatus(void) { return status; };
	void setStatus(game_status_t s) { status = s; };
	virtual std::string getName(void) = 0;
protected:
	static GameStatusMap* gameStatusMap;
	static char* gameStatusNames[NUM_GAME_STATUSES];
	virtual void _load(void) = 0;
	virtual void _play(Uint32 msecs, Input* input, float alpha) = 0;
	game_status_t status;
	bool loaded;
};


typedef ReferenceCount<GameComponent> GameComponentRef;

#endif
