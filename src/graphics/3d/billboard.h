// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct 10 18:11:25 2005

#ifndef BILLBOARD_H
#define BILLBOARD_H

class Billboard {
public:
    Billboard();
    virtual ~Billboard();
private:
    // Explicitly disable compiler generated copy functions
    Billboard(const Billboard& rhs);
    Billboard& operator=(const Billboard& rhs);
};

#endif // BILLBOARD_H
