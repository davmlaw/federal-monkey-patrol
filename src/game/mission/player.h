// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 23:25:08 2005
// Last modified: Sun Mar 20 23:25:08 2005

#ifndef PLAYER
#define PLAYER

#include "world/entities/entity.h"
#include "world/entities/inputfiltercontroller.h"

class Player {
public:
    enum playermode_t {
	TOPDOWN,
	FOLLOW,
	NUM_MODES
    };
    Player(const std::string& model, const std::string& skin,
	   float start_height, playermode_t m = TOPDOWN);
    virtual ~Player();
    Entity* entity;
    void read(Input& input);
    void setMode(playermode_t m);
private:
    InputFilterController* controller[NUM_MODES];
    playermode_t mode;
};

#endif // PLAYER
