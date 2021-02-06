import passport from 'passport';
import passportCustom from 'passport-custom';
import googleStrategy from 'passport-google-oauth20';
import User from '../db/models/user';
import OAuthUser from '../db/models/oauthUser';
import bcrypt from "bcryptjs";
import errorCodes from "../const/errorCodes";

const CustomStrategy = passportCustom.Strategy;
const GoogleStrategy = googleStrategy.Strategy;

export const initPassportStrategies = () => {
    passport.use('custom', new CustomStrategy(
        (req, callback) => {
            // @ts-ignore
            const {email, password} = req;

            User.findOne({email}, (error, user) => {
                if (error) return callback(error);
                if (!user) return callback(null, false);

                bcrypt.compare(password, user.password, function (error, isSuccess) {
                    if (error) return callback(error);
                    if (!isSuccess) return callback(errorCodes.LOGIN_INCORRECT_CREDENTIALS);

                    return callback(null, user);
                })
            });
        }
    ));

    passport.use('google', new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
        },
        function(accessToken, refreshToken, profile, callback) {
            OAuthUser.findOne({ googleId: profile.id }, async function (error, user) {
                if (error) return callback(error);

                if (!user) {
                    const createdUser = await OAuthUser.create({
                        googleId: profile.id,
                        avatar: profile.photos[0] && profile.photos[0].value,
                        email: profile.emails[0] && profile.emails[0].value,
                        username: profile.displayName,
                        role: 'USER',
                    });

                    return callback(null, createdUser);
                }

                return callback(null, user);
            });
        }
    ));
}
