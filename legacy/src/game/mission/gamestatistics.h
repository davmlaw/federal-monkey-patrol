// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Apr 11 21:17:43 2005
// Last modified: Mon Apr 11 21:17:43 2005

#ifndef GAMESTATISTICS
#define GAMESTATISTICS

#include "../../sdl_opengl.h"
#include <string>
#include <map>

typedef enum {
	NOSUCHSTAT,
	GAME_SECONDS,
	PLAYER_DEATHS,
	BULLETS_FIRED,
	BOMBS_DROPPED,
	MONKEY_DEATHS,
	MONKEY_POPULATION,
	BLONDE_RESCUES,
	BLONDE_CASUALTIES,
	BUILDINGS_DESTROYED,
	NUM_STATS
} stats_t;

typedef std::map<std::string,stats_t> StatMap;

/**
 * Keeps track of how many times different events occured
 * @see Comparator
 */
class GameStatistics {
public:
	static const char* statName(unsigned int i);
	static const stats_t statFromName(const std::string& name);
	GameStatistics();
	virtual ~GameStatistics();
	unsigned int get(stats_t s) {
		return s<NUM_STATS? stats[s] : 0;
	}
	void set(stats_t s, unsigned int i) {
		if( s<NUM_STATS )
			stats[s] = i;
	}
	unsigned int inc(stats_t s) {
		return s<NUM_STATS? ++stats[s] : 0;
	}
	unsigned int dec(stats_t s) {
		if( s<NUM_STATS )
			return --stats[s];
	}
	void addGameTime(Uint32 msecs);
	void reset(void);
private:
	static StatMap* statMap;
	static char* statNames[NUM_STATS];
	unsigned int stats[NUM_STATS];
	Uint32 gameSecsRemainder;
};

#endif // GAMESTATISTICS
