// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jun 20 00:48:03 2005
// Last modified: Mon Jun 20 00:48:03 2005

#ifndef CONSTRAINTS_H
#define CONSTRAINTS_H

#include "game/mission/player.h"

/**
 * Constrain player movement
 */
class Constraints {
public:
    Constraints();
    virtual ~Constraints();
    void restrict(Player* player);
    float max_height;
    float min_height;
    float max_speed;
    float min_speed;
private:
    // Explicitly disable compiler generated copy functions
    Constraints(const Constraints& rhs);
    Constraints& operator=(const Constraints& rhs);
    // FIXME: Constrain left/right along a vector?
};

#endif // CONSTRAINTS_H
