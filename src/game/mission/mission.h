// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 21 Aug 2004

#ifndef MISSION_H
#define MISSION_H

#include "game/gamecomponent.h"
#include "game/mission/outcomes/constraints.h"
#include "game/mission/giantclaw.h"
#include "game/mission/outcomes/ioutcomes.h"
#include "game/mission/player.h"
#include "game/mission/world/world.h"
#include "graphics/2d/clawalert.h"
#include "graphics/2d/container2d.h"
#include "graphics/2d/countdowntimer.h"
#include "graphics/camera/cameraman.h"
#include "util/fps_counter.h"
#include <string>

/**
 * Gameplay/game world etc all occur here
 */
class Mission : public GameComponent {
    friend class MissionBuilder;
public:
    Mission(const std::string& n);
    ~Mission();
    virtual std::string getName(void) {
	return std::string("Mission: ") + name;
    };
protected:
    virtual void _load(void);
    virtual void _play(Uint32 msecs, Input* input, float alpha);
private:
    void update(Uint32 msecs, Input* input);
    void draw(Uint32 msecs);
    void draw_2d_overlay(Uint32 msecs);
    std::string name;
    FPS_Counter fps_counter;
    World* world;
    Player* player;
    Constraints* constraints;
    CameraMan* cameraman;
    GiantClaw* claw;
    IOutcomes* outcomes;
    // 2d stuff
    Drawable2D* fogplane;
    Container2D* hud;
    ClawAlert* clawalert; // don't be alert, be alarmed!
    Drawable2D* chyron;
    Drawable2D* instructions;
    CountDownTimer* countdowntimer;
};

#endif // MISSION_H
