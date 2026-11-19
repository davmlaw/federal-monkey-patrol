// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 02 Jan 2005

#ifndef GAMEMANAGER_H
#define GAMEMANAGER_H

#include "game/gamecomponent.h"
#include "game/transition/transition.h"
#include "game/tuner/tuner.h"
#include "graphics/timer.h"
#include "input/input.h"
#include "input/menufilter.h"
#include <vector>

// GameComponents are Ref counted because transitions refer to "old" components
typedef std::vector<GameComponentRef*> gc_list_t;

/**
 * Manages Game Components
 * @see GameComponent
 */
class GameManager : public GameComponent {
    friend class GameFileReader;
public:
    GameManager(std::string filename);
    ~GameManager();
    std::string getName(void) { return "GameManager"; };
protected:
    void _load(void) { };
    void _play(Uint32 msecs, Input* input, float alpha);
    void addComponent(GameComponent* gc);
    void setTransition(Transition *t);
private:
    Tuner tuner;
    MenuFilter menu;
    Transition* transition;
    GameComponentRef* last_gcr;
    gc_list_t components;
    gc_list_t::iterator current;
};


#endif // GAMEMANAGER_H

