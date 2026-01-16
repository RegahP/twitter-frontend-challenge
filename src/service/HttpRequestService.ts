import type {
  PostData,
  PresignedDeleteResult,
  PresignedPutResult,
  SingInData,
  SingUpData,
} from "./index";
import axios from "axios";
import { S3Service } from "./S3Service";

const url = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

const axiosInstance = axios.create({
  baseURL: url,
});

const token = localStorage.getItem("token");
if (token) {
  axiosInstance.defaults.headers.common["Authorization"] = token;
}

const S3_PUBLIC_BASE_URL = (process.env.REACT_APP_S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");

const normalizeImageUrl = (value: string): string => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!S3_PUBLIC_BASE_URL) return value;
  return `${S3_PUBLIC_BASE_URL}/${value.replace(/^\/+/, "")}`;
};

const normalizePostImages = <T extends { images?: string[] }>(post: T): T => {
  if (!post?.images?.length) return post;
  return { ...post, images: post.images.map(normalizeImageUrl) };
};

const denormalizeImageKey = (value: string): string => {
  if (!value) return value;
  if (S3_PUBLIC_BASE_URL && value.startsWith(`${S3_PUBLIC_BASE_URL}/`)) {
    return value.slice(S3_PUBLIC_BASE_URL.length + 1);
  }
  return value.replace(/^\/+/, "");
};

const httpRequestService = {
  signUp: async (data: Partial<SingUpData>) => {
    const res = await axiosInstance.post(`/auth/signup`, data);
    if (res.status === 201) {
      localStorage.setItem("token", `Bearer ${res.data.token}`);
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${res.data.token}`;
      return true;
    }
  },
  signIn: async (data: SingInData) => {
    const res = await axiosInstance.post(`/auth/login`, data);
    if (res.status === 200) {
      localStorage.setItem("token", `Bearer ${res.data.token}`);
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${res.data.token}`;
      return true;
    }
  },

  // request uploadurls per image -> save s3 keys -> put image bytes to s3 -> post tweet with s3 keys
  createPost: async (data: PostData) => {
    const contentTypes = data.images?.map((image) => image.type) || [];

    const imgRes = await axiosInstance.post('/post/images/upload-urls', { contentTypes });
    if (imgRes.status === 200) {
      const uploads: PresignedPutResult[] = imgRes.data.uploads;
      const uploadUrls = uploads.map((upload) => upload.uploadUrl);
      const imageKeys = uploads.map((upload) => upload.key);
      const { upload } = S3Service;
      for (const imageUrl of uploadUrls) {
        const index: number = uploadUrls.indexOf(imageUrl);
        await upload(data.images![index], imageUrl);
      }
      const postPayload = {
        content: data.content,
        parentId: data.parentId,
        // Store keys in the DB so the backend can delete objects on post deletion.
        images: imageKeys,
      };
      const res = await axiosInstance.post(`/post`, postPayload);
      if (res.status === 201) {
        return normalizePostImages(res.data);
      }
    }
  },

  deletePost: async (id: string) => {
    // Best-effort cleanup: request presigned DELETE URLs for any stored image keys,
    // delete objects, then delete the post.
    try {
      const postRes = await axiosInstance.get(`/post/${id}`, {});
      const images: string[] = Array.isArray(postRes.data?.images)
        ? postRes.data.images
        : [];
      const imageKeys = images.map(denormalizeImageKey).filter(Boolean);

      if (imageKeys.length > 0) {
        // Backend endpoint expected:
        // POST /post/images/delete-urls { keys: string[] } -> { deletes: PresignedDeleteResult[] }
        const delRes = await axiosInstance.post(`/post/images/delete-urls`, {
          keys: imageKeys,
        });

        const deletes: PresignedDeleteResult[] = Array.isArray(delRes.data?.deletes)
          ? delRes.data.deletes
          : [];

        await Promise.all(deletes.map((d) => S3Service.deleteByUrl(d.deleteUrl)));
      }
    } catch (e) {
      // If cleanup fails (endpoint missing, etc.), still attempt to delete the post.
      console.log(e);
    }

    await axiosInstance.delete(`/post/${id}`, {});
  },

  getPaginatedPosts: async (limit: number, after: string, query: string) => {
    const res = await axiosInstance.get(`/post/${query}`, {
      params: {
        limit,
        after,
      },
    });
    if (res.status === 200) {
      return Array.isArray(res.data) ? res.data.map(normalizePostImages) : res.data;
    }
  },
  getPosts: async (limit: number, self: boolean = false, before?: string, after?: string) => {
    const res = await axiosInstance.get(`/post`, {
      params: {
        limit,
        self,
        before,
        after,
      },
    });
    if (res.status === 200) {
      return Array.isArray(res.data) ? res.data.map(normalizePostImages) : res.data;
    }
  },
  getRecommendedUsers: async (limit: number, skip: number) => {
    const res = await axiosInstance.get(`/user`, {
      params: {
        limit,
        skip,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },
  me: async () => {
    const res = await axiosInstance.get(`/user/me`);
    if (res.status === 200) {
      return res.data;
    }
  },
  getPostById: async (id: string) => {
    const res = await axiosInstance.get(`/post/${id}`, {});
    if (res.status === 200) {
      return normalizePostImages(res.data);
    }
  },
  getReaction: async (postId: string, type: string) => {
    const res = await axiosInstance.get(`/reaction/${postId}`, {
      params: { type },
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },
  createReaction: async (postId: string, type: string) => {
    const res = await axiosInstance.post(
      `/reaction/${postId}`,
      {},
      {
        params: { type },
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    if (res.status === 201) {
      return res.data;
    }
  },
  deleteReaction: async (postId: string, type: string) => {
    const res = await axiosInstance.delete(`/reaction/${postId}`, {
      params: { type },
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },
  followUser: async (userId: string) => {
    const res = await axiosInstance.post(`/follower/follow/${userId}`, {}, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },
  unfollowUser: async (userId: string) => {
    const res = await axiosInstance.post(`/follower/unfollow/${userId}`, {}, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },
  searchUsers: async (username: string, limit: number, skip: number) => {
    try {
      const cancelToken = axios.CancelToken.source();

      const response = await axiosInstance.get(`/user/search`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
        params: {
          username,
          limit,
          skip,
        },
        cancelToken: cancelToken.token,
      });

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      if (!axios.isCancel(error)) console.log(error);
    }
  },

  getProfile: async (id: string) => {
    const res = await axiosInstance.get(`/user/${id}`, {});
    if (res.status === 200) {
      return res.data;
    }
  },
  getPaginatedPostsFromProfile: async (
    limit: number,
    after: string,
    id: string
  ) => {
    const res = await axiosInstance.get(`/post/by_user/${id}`, {
      params: {
        limit,
        after,
      },
    });

    if (res.status === 200) {
      return Array.isArray(res.data) ? res.data.map(normalizePostImages) : res.data;
    }
  },
  getPostsFromProfile: async (id: string) => {
    const res = await axiosInstance.get(`/post/by_user/${id}`, {});

    if (res.status === 200) {
      return Array.isArray(res.data) ? res.data.map(normalizePostImages) : res.data;
    }
  },

  isLogged: async () => {
    const res = await axiosInstance.get(`/user/me`, {});
    return res.status === 200;
  },

  getProfileView: async (id: string) => {
    const res = await axiosInstance.get(`/user/${id}`, {});

    if (res.status === 200) {
      return res.data;
    }
  },

  deleteProfile: async () => {
    const res = await axiosInstance.delete(`/user/me`, {});

    if (res.status === 204) {
      localStorage.removeItem("token");
    }
  },

  getChats: async () => {
    const res = await axiosInstance.get(`/chat`, {});

    if (res.status === 200) {
      return res.data;
    }
  },

  getMutualFollows: async () => {
    const res = await axiosInstance.get(`/follow/mutual`, {});

    if (res.status === 200) {
      return res.data;
    }
  },

  createChat: async (id: string) => {
    const res = await axiosInstance.post(
      `/chat`,
      {
        users: [id],
      },
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    if (res.status === 201) {
      return res.data;
    }
  },

  getChat: async (id: string) => {
    const res = await axiosInstance.get(`/chat/${id}`, {});

    if (res.status === 200) {
      return res.data;
    }
  },

  getPaginatedCommentsByPostId: async (
    id: string,
    limit: number,
    after: string
  ) => {
    const res = await axiosInstance.get(`/post/comment/by_post/${id}`, {
      params: {
        limit,
        after,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
  },

  getCommentsByPostId: async (id: string) => {
    const res = await axiosInstance.get(`/post/comment/by_post/${id}`, {});
    if (res.status === 200) {
      return res.data;
    }
  },

  isFollowing: async (followedId: string) => {
    const res = await axiosInstance.get(
      `/follower/is-following?followedId=${followedId}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    if (res.status === 200) {
      const data = res.data;
      if (typeof data === "boolean") return { isFollowing: data };
      if (data && typeof data.isFollowing === "boolean") return { isFollowing: data.isFollowing };
      if (data && typeof data.following === "boolean") return { isFollowing: data.following };
      return { isFollowing: Boolean(data) };
    }
  },

  getFollowers: async (userId: string) => {
    const res = await axiosInstance.get(`/follower/followers/${userId}`, {});
    if (res.status === 200) {
      return res.data;
    }
  },

  getFollowing: async (userId: string) => {
    const res = await axiosInstance.get(`/follower/following/${userId}`, {});
    if (res.status === 200) {
      return res.data;
    }
  },
};

const useHttpRequestService = () => httpRequestService;

// For class component (remove when unused)
class HttpService {
  service = httpRequestService;
}

export { useHttpRequestService, HttpService };
