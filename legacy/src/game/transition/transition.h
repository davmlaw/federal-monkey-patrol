// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004
// Last modified: 15 Sep 2004

#ifndef TRANSITION_H
#define TRANSITION_H

#include <iostream>
#include <string>
#include "game/gamecomponent.h"
#include "graphics/2d/drawable2d.h"

/**
 * Special efftct to transition between GameComponents
 */
class Transition : public GameComponent, public Transitional2D {
public:
    Transition();
    virtual ~Transition() {
	if( prev ) delete prev;
	if( next ) delete next;
    };
    virtual std::string getName(void) { return "Transition"; };
    void setTime(Uint32 msecs) { transition_time = msecs; };
    void setPrev(GameComponentRef* p) { prev = new GameComponentRef(*p); };
    void setNext(GameComponentRef* n) { next = new GameComponentRef(*n); };
protected:
    virtual void _load(void) { }; // empty
    virtual void _play(Uint32 msecs, Input* input, GLfloat alpha);
    virtual void representation(GLfloat alpha) = 0;
    GameComponentRef* prev;
    GameComponentRef* next;
private:
    Uint32 transition_time;
    Uint32 time_displayed;
};

Transition* Transition_Factory(std::string type, Uint32 msecs=0);

#endif // TRANSITION_H
