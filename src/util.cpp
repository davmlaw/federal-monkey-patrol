#include <string.h>

#include "kong.h"

void chomp(char *str)
{
    int i;

    i = strlen(str) - 1;
    if( i >= 0 ) {
	str += i;
	if( *str == '\n' || *str == '\r' )
	    *str = '\0';
    }

}
